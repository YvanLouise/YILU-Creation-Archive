import { validateContent } from "../model/schema.js";

const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
const rawHtmlPattern = /<[a-z][\s\S]*>/i;

function publicAssetPath(value) {
  return String(value || "").replace(/^\.\//, "public/");
}

export function validateRepositoryContent(content, assetPaths = new Set()) {
  const issues = validateContent(content);
  const hasAsset = (value) =>
    !value ||
    assetPaths.size === 0 ||
    assetPaths.has(publicAssetPath(value));

  for (const work of content.works || []) {
    if (!work.hidden && !work.createdAt) {
      issues.push(`作品 ${work.slug} 缺少 createdAt`);
    }
    if (!hasAsset(work.cover)) {
      issues.push(`作品 ${work.slug} 的封面不存在: ${work.cover}`);
    }
  }

  for (const item of [
    ...(content.chapters || []),
    ...(content.characters || []),
    ...(content.notes || []),
  ]) {
    if (item.status === "published" && !item.createdAt) {
      issues.push(`${item.path || item.slug}: 已发布内容缺少 createdAt`);
    }
    if (rawHtmlPattern.test(item.body || "")) {
      issues.push(`${item.path || item.slug}: 正文禁止原始 HTML`);
    }
    for (const image of String(item.body || "").matchAll(imagePattern)) {
      if (!image[1].trim()) {
        issues.push(`${item.path || item.slug}: 图片缺少替代文本`);
      }
      if (!hasAsset(image[2])) {
        issues.push(`${item.path || item.slug}: 图片不存在: ${image[2]}`);
      }
    }
    if (item.cover && !hasAsset(item.cover)) {
      issues.push(`${item.path || item.slug}: 封面不存在: ${item.cover}`);
    }
  }

  return [...new Set(issues)];
}
