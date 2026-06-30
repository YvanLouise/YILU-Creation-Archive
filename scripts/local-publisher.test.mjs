import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyFiles,
  safeTarget,
} from "./content/local-file-publisher.mjs";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "ilu-local-publish-"));
}

test("local file publisher allows only public content paths", () => {
  const root = tempRoot();
  try {
    assert.equal(
      safeTarget(root, "src/content/site.json").endsWith("src\\content\\site.json") ||
      safeTarget(root, "src/content/site.json").endsWith("src/content/site.json"),
      true,
    );
    assert.throws(() => safeTarget(root, "package.json"));
    assert.throws(() => safeTarget(root, "src/content/../../secret"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("local file publisher applies upserts and deletions", () => {
  const root = tempRoot();
  try {
    applyFiles(root, [
      {
        path: "src/content/site.json",
        action: "upsert",
        encoding: "utf-8",
        content: "{}\n",
      },
      {
        path: "public/uploads/2026/06/image.png",
        action: "upsert",
        encoding: "base64",
        content: Buffer.from("image").toString("base64"),
      },
    ]);
    assert.equal(readFileSync(join(root, "src/content/site.json"), "utf8"), "{}\n");
    assert.equal(readFileSync(join(root, "public/uploads/2026/06/image.png"), "utf8"), "image");
    applyFiles(root, [{ path: "src/content/site.json", action: "delete" }]);
    assert.equal(existsSync(join(root, "src/content/site.json")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
