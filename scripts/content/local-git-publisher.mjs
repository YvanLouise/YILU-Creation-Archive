import { execFileSync, spawn } from "node:child_process";
import { resolve } from "node:path";
import { publishRequestSchema } from "../../src/content-system/index.js";
import { applyFiles } from "./local-file-publisher.mjs";

const publishTimeoutMs = Number(process.env.YILU_PUBLISH_TIMEOUT_MS || 10 * 60 * 1000);
const scriptErrorPattern = /(^|\s)(error:|fatal:|send-pack:|RPC failed|unexpected disconnect|NativeCommandError|FullyQualifiedErrorId|CategoryInfo|timed out|timeout)/i;

const progressMessages = {
  validate: "正在校验公开站点",
  "build-complete": "内容校验与生产构建已通过",
  stage: "正在暂存公开站点文件",
  commit: "正在创建 Git commit",
  "prune-history": "正在保留最新 6 次提交并裁剪旧历史",
  push: "正在推送到 GitHub main",
  verify: "正在核对远程提交",
  done: "提交与远程核对完成",
  unchanged: "没有需要提交的新变更",
};

function git(root, args, options = {}) {
  const result = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  return typeof result === "string" ? result.trim() : "";
}

function githubUrlFromRemote(remote) {
  const normalized = String(remote || "").trim();
  if (!normalized) return "";
  const httpsMatch = normalized.match(/^https:\/\/github\.com\/([^/]+\/[^/.]+)(?:\.git)?$/i);
  if (httpsMatch) return `https://github.com/${httpsMatch[1]}`;
  const sshMatch = normalized.match(/^git@github\.com:([^/]+\/[^/.]+)(?:\.git)?$/i);
  if (sshMatch) return `https://github.com/${sshMatch[1]}`;
  return normalized.startsWith("https://github.com/") ? normalized.replace(/\.git$/, "") : "";
}

export function repository(root) {
  const sha = git(root, ["rev-parse", "HEAD"], { capture: true });
  const remote = git(root, ["remote", "get-url", "origin"], { capture: true });
  const url = githubUrlFromRemote(remote);
  const name = url ? url.replace(/^https:\/\/github\.com\//, "") : remote.replace(/\.git$/, "");
  return { repository: name, branch: "main", sha, url };
}

function remoteMainSha(root) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const output = git(
        root,
        ["-c", "http.version=HTTP/1.1", "ls-remote", "--heads", "origin", "refs/heads/main"],
        { capture: true },
      );
      const [sha] = output.split(/\s+/);
      if (/^[0-9a-f]{40}$/i.test(sha || "")) return sha;
      lastError = new Error("GitHub 返回了无效的 main 分支状态。");
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1200);
    }
  }
  throw lastError || new Error("无法确认 GitHub 远程 main 分支的提交状态。");
}

function remoteTrackingSha(root) {
  try {
    return git(root, ["rev-parse", "refs/remotes/origin/main"], { capture: true });
  } catch {
    return "";
  }
}

export function verifyPublishedSha(root, sha, emit = () => {}) {
  try {
    return {
      remoteSha: remoteMainSha(root),
      verificationMode: "remote",
      verificationWarning: "",
    };
  } catch (error) {
    const remoteSha = remoteTrackingSha(root);
    const verificationWarning = `GitHub 推送可能已完成，但远程二次查询暂时不可用：${error.message}`;
    emit({ type: "log", stream: "normal", message: verificationWarning });
    return {
      remoteSha,
      verificationMode: "tracking",
      verificationWarning,
    };
  }
}

function consumeLines(stream, onLine) {
  let buffer = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    lines.forEach((line) => onLine(line.replace(/\x1b\[[0-9;]*m/g, "")));
  });
  stream.on("end", () => {
    if (buffer) onLine(buffer.replace(/\x1b\[[0-9;]*m/g, ""));
  });
}

function killProcessTree(pid) {
  if (!pid) return;
  const killer = spawn("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
    windowsHide: true,
    stdio: "ignore",
  });
  killer.on("error", () => {});
}

function runPublishScript(root, message, emit = () => {}) {
  return new Promise((resolvePromise, reject) => {
    const output = [];
    const errors = [];
    let settled = false;
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        resolve(root, "publish-github.ps1"),
        "-Message",
        message,
      ],
      {
        cwd: root,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const settle = (handler, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      handler(value);
    };
    const timeoutSeconds = Math.round(publishTimeoutMs / 1000);
    const timer = setTimeout(() => {
      const messageText = `一键发布脚本超过 ${timeoutSeconds} 秒未结束，已停止挂起的发布进程。请检查网络后重试。`;
      errors.push(messageText);
      emit({ type: "log", stream: "error", message: messageText });
      killProcessTree(child.pid);
      settle(reject, new Error(messageText));
    }, publishTimeoutMs);

    consumeLines(child.stdout, (line) => {
      const progress = line.match(/^::progress\|(\d+)\|(.*)$/);
      if (progress) {
        emit({
          type: "progress",
          value: Number(progress[1]),
          message: progressMessages[progress[2]] || progress[2],
        });
        return;
      }
      if (!line.trim()) return;
      if (scriptErrorPattern.test(line)) {
        errors.push(line);
        emit({ type: "log", stream: "error", message: line });
      } else {
        output.push(line);
        emit({ type: "log", stream: "normal", message: line });
      }
    });
    consumeLines(child.stderr, (line) => {
      if (!line.trim()) return;
      if (/^(warning:|\(!\)|-\s+(Using dynamic import|Use build\.rollupOptions|Adjust chunk size)|To https?:| +[0-9a-f]+\.\.[0-9a-f]+ +)/i.test(line)) {
        output.push(line);
        emit({ type: "log", stream: "normal", message: line });
        return;
      }
      errors.push(line);
      emit({ type: "log", stream: "error", message: line });
    });
    child.on("error", (error) => settle(reject, error));
    child.on("close", (code) => {
      if (code === 0) {
        settle(resolvePromise, output.join("\n"));
        return;
      }
      settle(reject, new Error(
        errors.slice(-12).join("\n") ||
        output.slice(-12).join("\n") ||
        `一键发布脚本执行失败（退出码 ${code}）。`,
      ));
    });
  });
}

export async function publishToGitHub(root, payload, emit = () => {}) {
  publishRequestSchema.parse(payload);
  emit({ type: "progress", value: 5, message: "正在核对本地仓库状态" });
  const current = repository(root);
  if (!payload.baseSha || payload.baseSha !== current.sha) {
    const error = new Error("仓库已发生变化，请刷新发布页面后重试。");
    error.status = 409;
    throw error;
  }
  const message = String(payload.message || "更新站内内容").trim().slice(0, 120);
  emit({ type: "progress", value: 10, message: `正在写入 ${payload.files.length} 个待发布文件` });
  applyFiles(root, payload.files);
  emit({ type: "log", stream: "normal", message: `已写入 ${payload.files.length} 个文件，开始执行 publish-github.ps1` });
  const output = await runPublishScript(root, message || "更新站内内容", emit);
  const sha = git(root, ["rev-parse", "HEAD"], { capture: true });
  const { remoteSha, verificationMode, verificationWarning } = verifyPublishedSha(root, sha, emit);
  if (remoteSha !== sha) {
    const error = new Error(
      `提交脚本已结束，但 GitHub 验证未通过：本地 ${sha.slice(0, 8)}，远程 ${remoteSha.slice(0, 8)}`,
    );
    error.status = 502;
    throw error;
  }
  emit({ type: "progress", value: 100, message: "GitHub 远程提交核对完成" });
  return {
    sha,
    remoteSha,
    verified: true,
    verificationMode,
    verificationWarning,
    verifiedAt: new Date().toISOString(),
    unchanged: sha === current.sha,
    publisher: "publish-github.ps1",
    output: output.trim().split(/\r?\n/).slice(-8),
  };
}
