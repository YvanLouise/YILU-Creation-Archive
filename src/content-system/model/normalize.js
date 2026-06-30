import {
  ContentValidationError,
  illustrationSchema,
  siteConfigSchema,
  validateContent,
  workSchema,
  markdownMetaSchema,
} from "./schema.js";
import { normalizeAssetPath, normalizeMarkdownImagePaths } from "./assetPaths.js";
import {
  normalizeChapterStructureFields,
  normalizeWorkStructure,
} from "./novelStructure.js";
import { normalizeWorkCategories } from "./workCategories.js";

export function sortByOrder(items) {
  return [...items].sort(
    (left, right) =>
      left.order - right.order ||
      left.title.localeCompare(right.title, "zh-CN"),
  );
}

export function normalizeWork(work) {
  work = normalizeWorkStructure(work);
  const normalized = work.type === "漫画"
    ? {
        workCategory: "",
        updateFrequency: "更新频率未定",
        readingMode: "vertical",
        ...work,
      }
    : {
        workCategory: "",
        ...work,
      };
  const withAssets = { ...normalized, cover: normalizeAssetPath(normalized.cover) };
  workSchema.parse(withAssets);
  return withAssets;
}

export function normalizeMarkdownItem(item) {
  item = normalizeChapterStructureFields(item);
  const normalized = {
    ...item,
    cover: item.cover === undefined ? item.cover : normalizeAssetPath(item.cover),
    body: normalizeMarkdownImagePaths(item.body),
    sections: item.sections.map((section) => ({
      ...section,
      body: normalizeMarkdownImagePaths(section.body),
    })),
  };
  markdownMetaSchema.parse(normalized);
  return normalized;
}

export function normalizeCharacter(character) {
  const normalized = {
    role: "",
    affiliation: "",
    profileStatus: "",
    aliases: [],
    traits: [],
    abilities: [],
    timeline: [],
    relationships: [],
    gallery: [],
    ...character,
  };
  const withAssets = {
    ...normalized,
    cover: normalizeAssetPath(normalized.cover),
    body: normalizeMarkdownImagePaths(normalized.body),
    abilities: normalized.abilities.map((ability) => ({
      ...ability,
      image: normalizeAssetPath(ability.image),
    })),
    gallery: normalized.gallery.map((image) => ({
      ...image,
      image: normalizeAssetPath(image.image),
    })),
  };
  markdownMetaSchema.parse(withAssets);
  return withAssets;
}

export function normalizeNote(note) {
  const normalized = {
    category: "创作笔记",
    tags: [],
    pinned: false,
    relatedWork: "",
    ...note,
  };
  const withAssets = {
    ...normalized,
    cover: normalized.cover === undefined ? normalized.cover : normalizeAssetPath(normalized.cover),
    body: normalizeMarkdownImagePaths(normalized.body),
  };
  markdownMetaSchema.parse(withAssets);
  return withAssets;
}

export function normalizeIllustration(illustration) {
  const normalized = {
    category: "场景",
    series: "",
    status: "draft",
    featured: false,
    ...illustration,
  };
  const withAssets = {
    ...normalized,
    image: normalizeAssetPath(normalized.image),
  };
  illustrationSchema.parse(withAssets);
  return withAssets;
}

export function normalizeContent(content) {
  const normalizedSite = {
    ...structuredClone(content.site),
    workCategories: normalizeWorkCategories(content.site.workCategories),
    author: {
      ...content.site.author,
      avatar: normalizeAssetPath(content.site.author?.avatar),
    },
  };
  siteConfigSchema.parse(normalizedSite);
  const normalized = {
    site: {
      showWorkbench: true,
      ...normalizedSite,
    },
    works: sortByOrder((content.works || []).map(normalizeWork)),
    chapters: sortByOrder((content.chapters || []).map(normalizeMarkdownItem)),
    characters: sortByOrder((content.characters || []).map(normalizeCharacter)),
    notes: sortByOrder((content.notes || []).map(normalizeNote)),
    illustrations: sortByOrder((content.illustrations || []).map(normalizeIllustration)),
  };
  const issues = validateContent(normalized);
  if (issues.length) throw new ContentValidationError(issues);
  return normalized;
}
