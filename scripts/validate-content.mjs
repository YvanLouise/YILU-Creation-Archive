import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  siteConfigSchema,
  validateRepositoryContent,
} from "../src/content-system/index.js";
import {
  readContentRepository,
  readPublicAssetPaths,
} from "./content/read-content.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const content = readContentRepository(root);
  siteConfigSchema.parse(content.site);
  const issues = validateRepositoryContent(
    content,
    readPublicAssetPaths(root),
  );
  if (issues.length) {
    console.error(`内容校验失败：\n- ${issues.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    const markdownCount =
      content.chapters.length +
      content.characters.length +
      content.notes.length;
    console.log(
      `内容校验通过：${content.works.length} 部作品，${markdownCount} 篇 Markdown 内容。`,
    );
  }
} catch (error) {
  console.error(`内容校验失败：\n- ${error.message}`);
  process.exitCode = 1;
}
