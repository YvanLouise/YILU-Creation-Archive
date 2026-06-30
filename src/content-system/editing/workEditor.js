import {
  normalizeSections,
  normalizeVolumes,
  wordCount,
} from "../model/novelStructure.js";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function getWorkRelations(content, slug) {
  const chapters = content.chapters.filter((item) => item.work === slug);
  const characters = content.characters.filter((item) => item.work === slug);
  return {
    chapters,
    characters,
    featured: content.site.featuredWorkSlug === slug,
    total: chapters.length + characters.length,
  };
}

export function renameWorkSlug(content, currentSlug, nextSlug) {
  const normalized = nextSlug.trim();
  if (!slugPattern.test(normalized)) {
    throw new Error("Slug 只能包含小写字母、数字和连字符。");
  }
  if (normalized !== currentSlug && content.works.some((work) => work.slug === normalized)) {
    throw new Error(`Slug “${normalized}” 已被其他作品使用。`);
  }
  if (normalized === currentSlug) return content;

  return {
    ...content,
    site: {
      ...content.site,
      featuredWorkSlug:
        content.site.featuredWorkSlug === currentSlug
          ? normalized
          : content.site.featuredWorkSlug,
    },
    works: content.works.map((work) =>
      work.slug === currentSlug ? { ...work, slug: normalized } : work,
    ),
    chapters: content.chapters.map((item) =>
      item.work === currentSlug ? { ...item, work: normalized } : item,
    ),
    characters: content.characters.map((item) =>
      item.work === currentSlug ? { ...item, work: normalized } : item,
    ),
  };
}

export function normalizeOrder(items) {
  return items.map((item, index) => ({ ...item, order: index + 1 }));
}

function moveItemById(items, id, direction) {
  const sourceIndex = items.findIndex((item) => item.id === id);
  const targetIndex = sourceIndex + direction;
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return normalizeOrder(next);
}

function moveItemToIndex(items, sourceIndex, targetIndex) {
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items;
  if (targetIndex >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return normalizeOrder(next);
}

export function newVolume(volumes = []) {
  const order = normalizeVolumes(volumes).length + 1;
  const suffix = Date.now().toString(36);
  return {
    id: `volume-${suffix}`,
    title: `第 ${order} 卷`,
    subtitle: "",
    summary: "",
    order,
    status: "visible",
    collapsed: false,
  };
}

export function moveVolumeBy(volumes, id, direction) {
  return moveItemById(normalizeVolumes(volumes), id, direction);
}

export function assignChapterVolume(content, chapterSlug, volumeId) {
  return {
    ...content,
    chapters: content.chapters.map((chapter) =>
      chapter.slug === chapterSlug ? { ...chapter, volume: volumeId || "" } : chapter,
    ),
  };
}

export function deleteVolume(content, workSlug, volumeId) {
  return {
    ...content,
    works: content.works.map((work) =>
      work.slug === workSlug
        ? { ...work, volumes: normalizeVolumes(work.volumes).filter((volume) => volume.id !== volumeId) }
        : work,
    ),
    chapters: content.chapters.map((chapter) =>
      chapter.work === workSlug && chapter.volume === volumeId ? { ...chapter, volume: "" } : chapter,
    ),
  };
}

export function moveChapterToVolume(content, workSlug, chapterSlug, volumeId, targetSlug = "") {
  const scoped = content.chapters
    .filter((chapter) => chapter.work === workSlug)
    .sort((a, b) => a.order - b.order);
  const sourceIndex = scoped.findIndex((chapter) => chapter.slug === chapterSlug);
  if (sourceIndex < 0) return content;

  const normalizedVolume = volumeId || "";
  const movedChapter = { ...scoped[sourceIndex], volume: normalizedVolume };
  const withoutMoved = scoped.filter((chapter) => chapter.slug !== chapterSlug);
  const targetIndex = targetSlug
    ? withoutMoved.findIndex((chapter) => chapter.slug === targetSlug)
    : -1;
  const fallbackIndex = withoutMoved.findLastIndex((chapter) => (chapter.volume || "") === normalizedVolume) + 1;
  const insertIndex = targetIndex >= 0 ? targetIndex : Math.max(0, fallbackIndex);
  const reordered = normalizeOrder([
    ...withoutMoved.slice(0, insertIndex),
    movedChapter,
    ...withoutMoved.slice(insertIndex),
  ]);
  let scopedIndex = 0;

  return {
    ...content,
    chapters: content.chapters.map((chapter) =>
      chapter.work === workSlug ? reordered[scopedIndex++] : chapter,
    ),
  };
}

export function newSection(sections = []) {
  const order = normalizeSections(sections).length + 1;
  const suffix = Date.now().toString(36);
  return {
    id: `section-${suffix}`,
    title: `小节 ${order}`,
    order,
    body: "",
    anchor: `section-${order}`,
  };
}

function uniqueSectionId(sections, baseId) {
  const ids = new Set(sections.map((section) => section.id));
  if (!ids.has(baseId)) return baseId;
  let suffix = 2;
  while (ids.has(`${baseId}-${suffix}`)) suffix += 1;
  return `${baseId}-${suffix}`;
}

export function migrateChapterBodyToFirstSection(chapter, title = "正文 1") {
  const sections = normalizeSections(chapter?.sections);
  const body = String(chapter?.body || "");
  if (!body.trim() && sections.length) {
    return { ...chapter, body: "", sections };
  }

  const firstSection = {
    id: uniqueSectionId(sections, "section-body"),
    title,
    order: 1,
    body,
    anchor: "section-1",
  };
  return {
    ...chapter,
    body: "",
    sections: normalizeSections([
      firstSection,
      ...sections.map((section) => ({ ...section, order: section.order + 1, anchor: "" })),
    ]),
  };
}

export function moveSectionBy(sections, id, direction) {
  return moveItemById(normalizeSections(sections), id, direction);
}

export function moveSectionTo(sections, sourceId, targetId) {
  const normalized = normalizeSections(sections);
  return moveItemToIndex(
    normalized,
    normalized.findIndex((section) => section.id === sourceId),
    normalized.findIndex((section) => section.id === targetId),
  );
}

export function sectionWordCount(section) {
  return wordCount(section?.body || "");
}

export function moveCollectionItem(items, sourceSlug, targetSlug) {
  const sourceIndex = items.findIndex((item) => item.slug === sourceSlug);
  const targetIndex = items.findIndex((item) => item.slug === targetSlug);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items;
  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return normalizeOrder(next);
}

export function moveCollectionItemBy(items, slug, direction) {
  const sourceIndex = items.findIndex((item) => item.slug === slug);
  const targetIndex = sourceIndex + direction;
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= items.length) return items;
  return moveCollectionItem(items, slug, items[targetIndex].slug);
}

export function reorderCategoryItems(items, categoryItems, nextCategoryItems) {
  const categorySlugs = new Set(categoryItems.map((item) => item.slug));
  const normalizedCategory = normalizeOrder(nextCategoryItems);
  let categoryIndex = 0;
  return items.map((item) =>
    categorySlugs.has(item.slug) ? normalizedCategory[categoryIndex++] : item,
  );
}

export function normalizeWorkOrdersByType(content) {
  const counters = { 小说: 0, 漫画: 0 };
  return {
    ...content,
    works: (content.works || []).map((work) => {
      if (!Object.hasOwn(counters, work.type)) return work;
      return { ...work, order: ++counters[work.type] };
    }),
  };
}

export function convertWorkType(content, slug, nextType) {
  const work = content.works.find((item) => item.slug === slug);
  if (!work || work.type === nextType) return content;
  const remaining = content.works.filter((item) => item.slug !== slug);
  const lastTargetIndex = remaining.reduce(
    (last, item, index) => item.type === nextType ? index : last,
    -1,
  );
  const converted = {
    ...work,
    type: nextType,
    workCategory: "",
    ...(nextType === "漫画"
      ? {
          updateFrequency: work.updateFrequency || "更新频率未定",
          readingMode: "vertical",
        }
      : {}),
  };
  remaining.splice(lastTargetIndex + 1, 0, converted);
  return normalizeWorkOrdersByType({ ...content, works: remaining });
}

export function coverPathFromMedia(mediaItem) {
  return `./${mediaItem.path.replace(/^public\//, "")}`;
}

export function resolveWorkCover(cover, media) {
  const draft = media.find((item) => coverPathFromMedia(item) === cover);
  return draft?.data || cover || "";
}

export function getWorkDeleteBlockers(content, slug) {
  const relations = getWorkRelations(content, slug);
  const blockers = [];
  if (relations.chapters.length) blockers.push(`${relations.chapters.length} 个章节`);
  if (relations.characters.length) blockers.push(`${relations.characters.length} 个角色`);
  if (relations.featured) blockers.push("首页主推作品");
  return blockers;
}
