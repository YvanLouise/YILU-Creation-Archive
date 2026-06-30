import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { assertSafeRepositoryPath } from "../../src/content-system/index.js";

export function safeTarget(root, path) {
  const normalized = assertSafeRepositoryPath(path);
  const target = resolve(root, normalized);
  if (!target.startsWith(`${root}${sep}`)) {
    throw new Error(`路径越界：${path}`);
  }
  return target;
}

export function applyFiles(root, files) {
  if (!Array.isArray(files) || files.length > 300) {
    throw new Error("发布文件列表无效");
  }
  for (const file of files) {
    const target = safeTarget(root, file.path);
    if (file.action === "delete") {
      rmSync(target, { force: true });
      continue;
    }
    if (file.action !== "upsert") {
      throw new Error(`未知文件操作：${file.action}`);
    }
    mkdirSync(dirname(target), { recursive: true });
    const content = file.encoding === "base64"
      ? Buffer.from(file.content, "base64")
      : file.content;
    writeFileSync(target, content);
  }
}
