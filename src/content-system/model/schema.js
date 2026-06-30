import { defaultChapterStructure } from "./novelStructure.js";
import { WORK_CATEGORY_KEYS } from "./workCategories.js";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const statuses = new Set(["draft", "published"]);
const updateSortModes = new Set(["createdAt", "date"]);
export const defaultIllustrationCategories = ["角色立绘", "封面插画", "场景", "黑白草图", "节日贺图", "过程稿"];

const isValidDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

const isValidIsoDateTime = (value) =>
  typeof value === "string" &&
  value.trim() !== "" &&
  !Number.isNaN(Date.parse(value));

export class ContentValidationError extends Error {
  constructor(issues) {
    super(issues.join("\n"));
    this.name = "ContentValidationError";
    this.issues = issues;
  }
}

function resultFrom(check) {
  return {
    parse(value) {
      const issues = check(value);
      if (issues.length) throw new ContentValidationError(issues);
      return value;
    },
    safeParse(value) {
      const issues = check(value);
      return issues.length
        ? { success: false, error: new ContentValidationError(issues) }
        : { success: true, data: value };
    },
  };
}

const requiredString = (value, path, issues) => {
  if (typeof value !== "string" || !value.trim()) issues.push(`${path} 必须是非空文本`);
};

const validateSlug = (value, path, issues) => {
  requiredString(value, path, issues);
  if (typeof value === "string" && !slugPattern.test(value)) {
    issues.push(`${path} 只能包含小写字母、数字和连字符`);
  }
};

const validateExternalUrl = (value, path, issues) => {
  requiredString(value, path, issues);
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) issues.push(`${path} 必须使用 http 或 https`);
  } catch {
    issues.push(`${path} 必须是有效网址`);
  }
};

const validateWorkCategories = (value, path, issues) => {
  if (value === undefined) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push(`${path} 必须是对象`);
    return;
  }
  for (const key of WORK_CATEGORY_KEYS) {
    const categories = value[key];
    if (!Array.isArray(categories)) {
      issues.push(`${path}.${key} 必须是数组`);
      continue;
    }
    const ids = new Set();
    const labels = new Set();
    for (const [index, category] of categories.entries()) {
      const itemPath = `${path}.${key}[${index}]`;
      if (!category || typeof category !== "object" || Array.isArray(category)) {
        issues.push(`${itemPath} 必须是对象`);
        continue;
      }
      validateSlug(category.id, `${itemPath}.id`, issues);
      requiredString(category.label, `${itemPath}.label`, issues);
      if (ids.has(category.id)) issues.push(`${path}.${key}.id 不能重复`);
      if (labels.has(category.label?.trim())) issues.push(`${path}.${key}.label 不能重复`);
      ids.add(category.id);
      labels.add(category.label?.trim());
    }
  }
};

const validateChapterStructure = (value, path, issues) => {
  if (value === undefined) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push(`${path} must be an object`);
    return;
  }
  for (const key of ["enableVolumes", "enableSections"]) {
    if (value[key] !== undefined && typeof value[key] !== "boolean") {
      issues.push(`${path}.${key} must be a boolean`);
    }
  }
  for (const key of ["volumeLabel", "chapterLabel", "sectionLabel"]) {
    if (value[key] !== undefined && (typeof value[key] !== "string" || !value[key].trim())) {
      issues.push(`${path}.${key} must be non-empty text`);
    }
  }
};

const validateVolumes = (value, path, issues) => {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return;
  }
  const ids = new Set();
  for (const [index, volume] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!volume || typeof volume !== "object" || Array.isArray(volume)) {
      issues.push(`${itemPath} must be an object`);
      continue;
    }
    requiredString(volume.id, `${itemPath}.id`, issues);
    requiredString(volume.title, `${itemPath}.title`, issues);
    if (typeof volume.id === "string") {
      if (ids.has(volume.id)) issues.push(`${path}.id must be unique`);
      ids.add(volume.id);
    }
    for (const key of ["subtitle", "summary"]) {
      if (volume[key] !== undefined && typeof volume[key] !== "string") {
        issues.push(`${itemPath}.${key} must be text`);
      }
    }
    if (!Number.isFinite(volume.order)) issues.push(`${itemPath}.order must be a number`);
    if (!["visible", "hidden"].includes(volume.status)) {
      issues.push(`${itemPath}.status must be visible or hidden`);
    }
    if (volume.collapsed !== undefined && typeof volume.collapsed !== "boolean") {
      issues.push(`${itemPath}.collapsed must be a boolean`);
    }
  }
};

const validateSections = (value, path, issues) => {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return;
  }
  const ids = new Set();
  const anchors = new Set();
  for (const [index, section] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      issues.push(`${itemPath} must be an object`);
      continue;
    }
    requiredString(section.id, `${itemPath}.id`, issues);
    requiredString(section.title, `${itemPath}.title`, issues);
    if (typeof section.id === "string") {
      if (ids.has(section.id)) issues.push(`${path}.id must be unique`);
      ids.add(section.id);
    }
    if (!Number.isFinite(section.order)) issues.push(`${itemPath}.order must be a number`);
    if (typeof section.body !== "string") issues.push(`${itemPath}.body must be text`);
    requiredString(section.anchor, `${itemPath}.anchor`, issues);
    if (typeof section.anchor === "string") {
      if (anchors.has(section.anchor)) issues.push(`${path}.anchor must be unique`);
      anchors.add(section.anchor);
    }
  }
};

function workLabel(work) {
  const label = `“${work.title || work.slug || "未命名作品"}”(${work.slug || "unknown"})`;
  return work.path ? `${label} @ ${work.path}` : label;
}

function duplicateWorkOrderIssues(works, type) {
  const groups = new Map();
  for (const work of works.filter((item) => item.type === type && Number.isFinite(item.order))) {
    const group = groups.get(work.order) || [];
    group.push(work);
    groups.set(work.order, group);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([order, group]) =>
      `${type}作品排序重复：排序 ${order} 被 ${group.map(workLabel).join("、")} 同时使用。请在管理站${type}列表中上移或下移任一作品以自动重排。`,
    );
}

export const siteConfigSchema = resultFrom((value) => {
  const issues = [];
  if (!value || typeof value !== "object") return ["site 必须是对象"];
  requiredString(value.brand?.name, "brand.name", issues);
  requiredString(value.brand?.subtitle, "brand.subtitle", issues);
  requiredString(value.brand?.email, "brand.email", issues);
  if (value.brand?.url !== undefined) validateExternalUrl(value.brand.url, "brand.url", issues);
  requiredString(value.author?.name, "author.name", issues);
  requiredString(value.author?.intro, "author.intro", issues);
  validateSlug(value.featuredWorkSlug, "featuredWorkSlug", issues);
  if (!Array.isArray(value.stats)) issues.push("stats 必须是数组");
  if (!updateSortModes.has(value.updatesSortMode)) {
    issues.push("updatesSortMode 必须是 createdAt 或 date");
  }
  if (value.showWorkbench !== undefined && typeof value.showWorkbench !== "boolean") {
    issues.push("showWorkbench 必须是布尔值");
  }
  if (value.socialLinks !== undefined && !Array.isArray(value.socialLinks)) {
    issues.push("socialLinks 必须是数组");
  }
  for (const [index, link] of (value.socialLinks || []).entries()) {
    requiredString(link?.id, `socialLinks[${index}].id`, issues);
    requiredString(link?.label, `socialLinks[${index}].label`, issues);
    if (typeof link?.enabled !== "boolean") issues.push(`socialLinks[${index}].enabled 必须是布尔值`);
    if (link?.enabled || link?.url) validateExternalUrl(link?.url, `socialLinks[${index}].url`, issues);
  }
  const socialIds = (value.socialLinks || []).map((link) => link.id);
  if (new Set(socialIds).size !== socialIds.length) issues.push("socialLinks.id 不能重复");
  validateWorkCategories(value.workCategories, "workCategories", issues);
  return issues;
});

export const workSchema = resultFrom((value) => {
  const issues = [];
  if (!value || typeof value !== "object") return ["work 必须是对象"];
  validateSlug(value.slug, "work.slug", issues);
  requiredString(value.title, "work.title", issues);
  if (typeof value.subtitle !== "string") issues.push("work.subtitle 必须是文本");
  requiredString(value.description, "work.description", issues);
  requiredString(value.cover, "work.cover", issues);
  requiredString(value.status, "work.status", issues);
  requiredString(value.progress, "work.progress", issues);
  if (!isValidDate(value.date)) issues.push("work.date 必须是 YYYY-MM-DD 日期");
  if (value.createdAt !== undefined && value.createdAt !== "" && !isValidIsoDateTime(value.createdAt)) {
    issues.push("work.createdAt 必须是 ISO 日期时间");
  }
  if (!["小说", "漫画"].includes(value.type)) issues.push("work.type 必须是小说或漫画");
  if (!Array.isArray(value.genre) || !value.genre.length) {
    issues.push("work.genre 必须包含至少一个题材");
  } else if (value.genre.some((genre) => typeof genre !== "string" || !genre.trim())) {
    issues.push("work.genre 不能包含空题材");
  }
  if (value.workCategory !== undefined && typeof value.workCategory !== "string") {
    issues.push("work.workCategory 必须是文本");
  }
  if (!Number.isFinite(value.order)) issues.push("work.order 必须是数字");
  if (typeof value.hidden !== "boolean") issues.push("work.hidden 必须是布尔值");
  if (value.type === "漫画") {
    if (value.updateFrequency !== undefined) {
      requiredString(value.updateFrequency, "work.updateFrequency", issues);
    }
    if (value.readingMode !== undefined && value.readingMode !== "vertical") {
      issues.push("work.readingMode 必须是 vertical");
    }
  }
  validateChapterStructure(value.chapterStructure || defaultChapterStructure, "work.chapterStructure", issues);
  validateVolumes(value.volumes || [], "work.volumes", issues);
  return issues;
});

export const illustrationSchema = resultFrom((value) => {
  const issues = [];
  if (!value || typeof value !== "object") return ["illustration 必须是对象"];
  validateSlug(value.slug, "illustration.slug", issues);
  requiredString(value.title, "illustration.title", issues);
  requiredString(value.summary, "illustration.summary", issues);
  requiredString(value.image, "illustration.image", issues);
  requiredString(value.category, "illustration.category", issues);
  if (typeof value.series !== "string") issues.push("illustration.series 必须是文本");
  if (!isValidDate(value.date)) issues.push("illustration.date 必须是 YYYY-MM-DD 日期");
  if (!Number.isFinite(value.order)) issues.push("illustration.order 必须是数字");
  if (!statuses.has(value.status)) issues.push("illustration.status 必须是 draft 或 published");
  if (typeof value.featured !== "boolean") issues.push("illustration.featured 必须是布尔值");
  return issues;
});

export function validateContent(content) {
  const issues = [];
  const workSlugs = new Set();
  const worksBySlug = new Map();
  for (const work of content.works || []) {
    const result = workSchema.safeParse(work);
    if (!result.success) issues.push(...result.error.issues);
    if (workSlugs.has(work.slug)) issues.push(`重复作品 slug: ${work.slug}`);
    workSlugs.add(work.slug);
    worksBySlug.set(work.slug, work);
  }
  for (const [collection, items] of Object.entries({
    chapters: content.chapters || [],
    characters: content.characters || [],
    notes: content.notes || [],
  })) {
    for (const item of items) {
      const result = markdownMetaSchema.safeParse(item);
      if (!result.success) {
        issues.push(...result.error.issues.map((issue) => `${collection}.${item.slug || "unknown"}: ${issue}`));
      }
    }
  }
  for (const item of [...(content.chapters || []), ...(content.characters || [])]) {
    if (item.kind === "character" && !item.work) continue;
    if (!workSlugs.has(item.work)) issues.push(`${item.title || item.slug} 引用了不存在的作品 ${item.work}`);
  }
  const characterSlugs = new Set((content.characters || []).map((character) => character.slug));
  for (const character of content.characters || []) {
    for (const relationship of character.relationships || []) {
      if (!relationship.characterSlug) continue;
      if (relationship.characterSlug === character.slug) {
        issues.push(`${character.title || character.slug} 的人物关系不能指向自身`);
      } else if (!characterSlugs.has(relationship.characterSlug)) {
        issues.push(`${character.title || character.slug} 引用了不存在的关联角色 ${relationship.characterSlug}`);
      }
    }
  }
  for (const note of content.notes || []) {
    if (!note.relatedWork) continue;
    const relatedWork = worksBySlug.get(note.relatedWork);
    if (!relatedWork) {
      issues.push(`${note.title || note.slug} 引用了不存在的关联作品 ${note.relatedWork}`);
    } else if (relatedWork.hidden) {
      issues.push(`${note.title || note.slug} 关联的作品 ${note.relatedWork} 尚未公开`);
    }
  }
  for (const item of content.chapters || []) {
    const work = worksBySlug.get(item.work);
    if (work?.type === "漫画") {
      const images = [...String(item.body || "").matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
      if (!images.length) issues.push(`漫画话“${item.title || item.slug}”至少需要一张图片`);
      for (const image of images) {
        if (!image[1].trim()) issues.push(`漫画话“${item.title || item.slug}”存在缺少替代文本的图片`);
      }
    }
  }
  for (const type of ["小说", "漫画"]) {
    issues.push(...duplicateWorkOrderIssues(content.works || [], type));
  }
  const illustrationSlugs = new Set();
  for (const item of content.illustrations || []) {
    const result = illustrationSchema.safeParse(item);
    if (!result.success) issues.push(...result.error.issues);
    if (illustrationSlugs.has(item.slug)) issues.push(`重复插画 slug: ${item.slug}`);
    illustrationSlugs.add(item.slug);
  }
  const featured = (content.works || []).find(
    (work) => work.slug === content.site?.featuredWorkSlug,
  );
  if (!featured) issues.push("site.featuredWorkSlug 引用了不存在的作品");
  else if (featured.hidden) issues.push("首页主推作品必须处于公开状态");
  return issues;
}

export const markdownMetaSchema = resultFrom((value) => {
  const issues = [];
  if (!value || typeof value !== "object") return ["frontmatter 必须是对象"];
  requiredString(value.title, "title", issues);
  validateSlug(value.slug, "slug", issues);
  if (value.summary !== undefined && typeof value.summary !== "string") {
    issues.push("summary 必须是文本");
  }
  requiredString(value.date, "date", issues);
  if (!isValidDate(value.date)) issues.push("date 必须是 YYYY-MM-DD 日期");
  if (value.createdAt !== undefined && value.createdAt !== "" && !isValidIsoDateTime(value.createdAt)) {
    issues.push("createdAt 必须是 ISO 日期时间");
  }
  if (!statuses.has(value.status)) issues.push("status 必须是 draft 或 published");
  if (!Number.isFinite(value.order)) issues.push("order 必须是数字");
  if (value.volume !== undefined && typeof value.volume !== "string") {
    issues.push("volume must be text");
  }
  validateSections(value.sections || [], "sections", issues);
  if (value.category !== undefined && typeof value.category !== "string") {
    issues.push("category 必须是文本");
  }
  if (value.tags !== undefined) {
    if (!Array.isArray(value.tags)) {
      issues.push("tags 必须是数组");
    } else if (value.tags.some((tag) => typeof tag !== "string" || !tag.trim())) {
      issues.push("tags 不能包含空标签");
    }
  }
  if (value.pinned !== undefined && typeof value.pinned !== "boolean") {
    issues.push("pinned 必须是布尔值");
  }
  if (value.relatedWork !== undefined && typeof value.relatedWork !== "string") {
    issues.push("relatedWork 必须是文本");
  }
  for (const field of ["role", "affiliation", "profileStatus"]) {
    if (value[field] !== undefined && typeof value[field] !== "string") {
      issues.push(`${field} 必须是文本`);
    }
  }
  for (const field of ["aliases", "traits"]) {
    if (value[field] === undefined) continue;
    if (!Array.isArray(value[field])) {
      issues.push(`${field} 必须是数组`);
    } else if (value[field].some((entry) => typeof entry !== "string" || !entry.trim())) {
      issues.push(`${field} 不能包含空内容`);
    }
  }
  const objectArrayFields = {
    abilities: ["name", "description", "image"],
    timeline: ["label", "description"],
    relationships: ["characterSlug", "label", "description"],
    gallery: ["label", "image"],
  };
  for (const [field, allowedKeys] of Object.entries(objectArrayFields)) {
    if (value[field] === undefined) continue;
    if (!Array.isArray(value[field])) {
      issues.push(`${field} 必须是数组`);
      continue;
    }
    for (const [index, entry] of value[field].entries()) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        issues.push(`${field}[${index}] 必须是对象`);
        continue;
      }
      for (const key of allowedKeys) {
        if (entry[key] !== undefined && typeof entry[key] !== "string") {
          issues.push(`${field}[${index}].${key} 必须是文本`);
        }
      }
    }
  }
  return issues;
});

export const publishRequestSchema = resultFrom((value) => {
  const issues = [];
  if (!value || typeof value !== "object") return ["发布请求必须是对象"];
  requiredString(value.baseSha, "baseSha", issues);
  requiredString(value.message, "message", issues);
  if (!Array.isArray(value.files) || !value.files.length) issues.push("files 必须包含至少一个变更");
  for (const [index, file] of (value.files || []).entries()) {
    requiredString(file.path, `files[${index}].path`, issues);
    if (!["upsert", "delete"].includes(file.action)) issues.push(`files[${index}].action 无效`);
    if (file.action === "upsert" && typeof file.content !== "string") {
      issues.push(`files[${index}].content 必须是文本或 base64`);
    }
  }
  return issues;
});

export function assertSafeRepositoryPath(path) {
  const normalized = String(path).replaceAll("\\", "/");
  const allowed =
    normalized === "README.md" ||
    normalized === "src/content/site.json" ||
    /^src\/content\/works\/[a-z0-9-]+\/work\.json$/.test(normalized) ||
    /^src\/content\/works\/[a-z0-9-]+\/chapters\/[a-z0-9-]+\.md$/.test(normalized) ||
    /^src\/content\/illustrations\/[a-z0-9-]+\.json$/.test(normalized) ||
    /^src\/content\/(characters|notes)\/[a-z0-9-]+\.md$/.test(normalized) ||
    /^public\/uploads\/\d{4}\/\d{2}\/[a-z0-9-]+\.(png|jpe?g|webp)$/.test(normalized);
  if (!allowed || normalized.includes("..")) {
    throw new ContentValidationError([`不允许发布路径：${path}`]);
  }
  return normalized;
}

export const contentSchemas = {
  site: siteConfigSchema,
  work: workSchema,
  illustration: illustrationSchema,
  markdown: markdownMetaSchema,
  publish: publishRequestSchema,
};
