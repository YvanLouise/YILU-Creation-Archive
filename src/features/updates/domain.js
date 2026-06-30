import {
  createContentIndex,
  publishedCharactersForVisibleWorksOrNone,
  publishedItems,
  publishedItemsForVisibleWorks,
} from "../../content-system/query/selectors.js";

const updateTypes = new Set(["all", "work", "novelChapter", "comicEpisode", "character", "note", "illustration"]);

function isoAtStartOfDay(date) {
  return date ? `${date}T00:00:00.000Z` : "";
}

function timestamp(value, fallback = 0) {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? fallback : parsed;
}

function dateTimestamp(value) {
  return timestamp(value ? `${value}T00:00:00Z` : "");
}

function createdTimestamp(item) {
  return timestamp(item.createdAt, dateTimestamp(item.date));
}

function updateDocument(item, {
  kind,
  filterType,
  kindLabel,
  href,
  image = "",
  work = null,
}) {
  return {
    kind,
    filterType,
    kindLabel,
    slug: item.slug,
    title: item.title,
    summary: item.description || item.summary || "",
    date: item.date,
    createdAt: item.createdAt || `${item.date}T00:00:00.000Z`,
    order: item.order || 0,
    href,
    image: image || work?.cover || "",
    workTitle: work?.title || "",
    workType: work?.type || "",
  };
}

export function normalizeUpdatesType(value) {
  return updateTypes.has(value) ? value : "all";
}

export function buildUpdateDocuments(content) {
  const index = createContentIndex(content);
  const documents = index.works.map((work) => updateDocument(work, {
    kind: "work",
    filterType: "work",
    kindLabel: work.type,
    href: `#/works/${work.slug}`,
    image: work.cover,
  }));

  for (const chapter of publishedItemsForVisibleWorks(content.chapters, index)) {
    const work = index.worksBySlug.get(chapter.work);
    const isComic = work.type === "漫画";
    documents.push(updateDocument(chapter, {
      kind: "chapter",
      filterType: isComic ? "comicEpisode" : "novelChapter",
      kindLabel: isComic ? "漫画话数" : "小说章节",
      href: `#/works/${work.slug}/chapters/${chapter.slug}`,
      image: chapter.cover,
      work,
    }));
  }

  for (const character of publishedCharactersForVisibleWorksOrNone(content.characters, index)) {
    const work = index.worksBySlug.get(character.work);
    documents.push(updateDocument(character, {
      kind: "character",
      filterType: "character",
      kindLabel: "角色",
      href: `#/characters/${character.slug}`,
      image: character.cover,
      work,
    }));
  }

  for (const note of publishedItems(content.notes)) {
    const relatedWork = note.relatedWork
      ? index.worksBySlug.get(note.relatedWork)
      : null;
    documents.push(updateDocument(note, {
      kind: "note",
      filterType: "note",
      kindLabel: "创作笔记",
      href: `#/notes/${note.slug}`,
      image: note.cover,
      work: relatedWork,
    }));
  }
  for (const illustration of publishedItems(content.illustrations || [])) {
    documents.push(updateDocument(illustration, {
      kind: "illustration",
      filterType: "illustration",
      kindLabel: "插画",
      href: "#/illustrations",
      image: illustration.image,
    }));
  }
  return documents;
}

export function sortUpdateDocuments(documents, mode = "createdAt") {
  const primaryCreatedAt = mode === "createdAt";
  return [...documents].sort((a, b) => {
    const primary = primaryCreatedAt
      ? createdTimestamp(b) - createdTimestamp(a)
      : dateTimestamp(b.date) - dateTimestamp(a.date);
    if (primary) return primary;
    const secondary = primaryCreatedAt
      ? dateTimestamp(b.date) - dateTimestamp(a.date)
      : createdTimestamp(b) - createdTimestamp(a);
    if (secondary) return secondary;
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title, "zh-CN");
  });
}

export function resolveUpdates(content, type = "all") {
  const normalizedType = normalizeUpdatesType(type);
  const documents = buildUpdateDocuments(content);
  const filtered = normalizedType === "all"
    ? documents
    : documents.filter((item) => item.filterType === normalizedType);
  return sortUpdateDocuments(filtered, content.site.updatesSortMode);
}

export function resolveHomeUpdates(content, limit = 4) {
  return resolveUpdates(content).slice(0, limit);
}

export function updateDisplayDate(update, mode = "createdAt") {
  return mode === "createdAt"
    ? update.createdAt.slice(0, 10)
    : update.date;
}

export function visibleUpdatesPage(updates, visibleCount, pageSize = 12) {
  const normalizedCount = Math.max(pageSize, Math.ceil(visibleCount / pageSize) * pageSize);
  return {
    items: updates.slice(0, normalizedCount),
    visibleCount: normalizedCount,
    hasMore: normalizedCount < updates.length,
    nextVisibleCount: normalizedCount + pageSize,
  };
}

export function migrateUpdateMetadata(content, fallbackDate = new Date().toISOString().slice(0, 10)) {
  const next = structuredClone(content);
  const legacyModel = !["createdAt", "date"].includes(next.site?.updatesSortMode) ||
    Object.hasOwn(next.site || {}, "updates");
  const { updates: _legacyUpdates, ...site } = next.site || {};
  next.site = {
    ...site,
    updatesSortMode: ["createdAt", "date"].includes(site.updatesSortMode)
      ? site.updatesSortMode
      : "createdAt",
  };
  const chapterDatesByWork = new Map();
  for (const chapter of next.chapters || []) {
    if (!chapter.work || !chapter.date) continue;
    const dates = chapterDatesByWork.get(chapter.work) || [];
    dates.push(chapter.date);
    chapterDatesByWork.set(chapter.work, dates);
  }
  next.works = (next.works || []).map((work) => {
    const relatedDates = chapterDatesByWork.get(work.slug) || [];
    const date = work.date || [...relatedDates].sort()[0] || fallbackDate;
    return {
      ...work,
      date,
      createdAt: work.createdAt || (legacyModel && !work.hidden ? isoAtStartOfDay(date) : ""),
    };
  });
  const migrateItems = (items) => (items || []).map((item) => ({
    ...item,
    createdAt: item.createdAt || (legacyModel && item.status === "published" ? isoAtStartOfDay(item.date) : ""),
  }));
  next.chapters = migrateItems(next.chapters);
  next.characters = migrateItems(next.characters);
  next.notes = migrateItems(next.notes);
  next.illustrations = migrateItems(next.illustrations);
  return next;
}
