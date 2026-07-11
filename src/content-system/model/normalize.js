import {
  ContentValidationError,
  illustrationSchema,
  siteConfigSchema,
  validateContent,
  workSchema,
  markdownMetaSchema,
} from "./schema.js";
import { normalizeAssetPath, normalizeMarkdownImagePaths } from "./assetPaths.js";
import { normalizeImagePresentation } from "../../shared/imagePresentation.js";
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
  const withAssets = {
    ...normalized,
    cover: normalizeAssetPath(normalized.cover),
    ...(normalized.coverPresentation === undefined
      ? {}
      : { coverPresentation: normalizeImagePresentation(normalized.coverPresentation) }),
  };
  workSchema.parse(withAssets);
  return withAssets;
}

export function normalizeMarkdownItem(item) {
  item = normalizeChapterStructureFields(item);
  const normalized = {
    ...item,
    cover: item.cover === undefined ? item.cover : normalizeAssetPath(item.cover),
    ...(item.coverPresentation === undefined
      ? {}
      : { coverPresentation: normalizeImagePresentation(item.coverPresentation) }),
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
    ...(normalized.coverPresentation === undefined
      ? {}
      : { coverPresentation: normalizeImagePresentation(normalized.coverPresentation) }),
    body: normalizeMarkdownImagePaths(normalized.body),
    abilities: normalized.abilities.map((ability) => ({
      ...ability,
      image: normalizeAssetPath(ability.image),
      ...(ability.imagePresentation === undefined
        ? {}
        : { imagePresentation: normalizeImagePresentation(ability.imagePresentation) }),
    })),
    gallery: normalized.gallery.map((image) => ({
      ...image,
      image: normalizeAssetPath(image.image),
      ...(image.imagePresentation === undefined
        ? {}
        : { imagePresentation: normalizeImagePresentation(image.imagePresentation) }),
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
    ...(normalized.coverPresentation === undefined
      ? {}
      : { coverPresentation: normalizeImagePresentation(normalized.coverPresentation) }),
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
    ...(normalized.imagePresentation === undefined
      ? {}
      : { imagePresentation: normalizeImagePresentation(normalized.imagePresentation) }),
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
      ...(content.site.author?.avatarPresentation === undefined
        ? {}
        : { avatarPresentation: normalizeImagePresentation(content.site.author.avatarPresentation) }),
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
