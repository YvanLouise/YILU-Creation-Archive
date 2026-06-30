import fs from "node:fs";
import path from "node:path";
import { parseMarkdownFile } from "../../src/content-system/markdown/frontmatter.js";

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function markdownKind(file) {
  if (file.includes(`${path.sep}chapters${path.sep}`)) return "chapter";
  if (file.includes(`${path.sep}characters${path.sep}`)) return "character";
  return "note";
}

export function readContentRepository(root) {
  const contentRoot = path.join(root, "src", "content");
  const markdownItems = walk(contentRoot)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const parsed = parseMarkdownFile(fs.readFileSync(file, "utf8"));
      return {
        kind: markdownKind(file),
        path: path.relative(root, file).replaceAll("\\", "/"),
        ...parsed.meta,
        body: parsed.body,
      };
    });

  return {
    site: readJson(path.join(contentRoot, "site.json")),
    works: walk(path.join(contentRoot, "works"))
      .filter((file) => file.endsWith(`${path.sep}work.json`))
      .map((file) => ({
        ...readJson(file),
        path: path.relative(root, file).replaceAll("\\", "/"),
      })),
    chapters: markdownItems.filter((item) => item.kind === "chapter"),
    characters: markdownItems.filter((item) => item.kind === "character"),
    notes: markdownItems.filter((item) => item.kind === "note"),
  };
}

export function readPublicAssetPaths(root) {
  return new Set(
    walk(path.join(root, "public"))
      .map((file) => path.relative(root, file).replaceAll("\\", "/")),
  );
}
