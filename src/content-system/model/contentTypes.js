export const WORK_TYPES = {
  NOVEL: "小说",
  COMIC: "漫画",
};

export const contentSections = {
  novels: {
    id: "novels",
    label: "小说",
    collection: "works",
    workType: WORK_TYPES.NOVEL,
    itemLabel: "小说",
  },
  novelChapters: {
    id: "novelChapters",
    label: "小说章节",
    collection: "chapters",
    workType: WORK_TYPES.NOVEL,
    itemLabel: "章节",
  },
  comics: {
    id: "comics",
    label: "漫画",
    collection: "works",
    workType: WORK_TYPES.COMIC,
    itemLabel: "漫画",
  },
  comicEpisodes: {
    id: "comicEpisodes",
    label: "漫画话数",
    collection: "chapters",
    workType: WORK_TYPES.COMIC,
    itemLabel: "话",
  },
};

export function workTypeFor(content, workSlug) {
  return content.works.find((work) => work.slug === workSlug)?.type || "";
}

export function itemsForSection(content, sectionId) {
  const descriptor = contentSections[sectionId];
  if (!descriptor) return [];
  if (descriptor.collection === "works") {
    return content.works.filter((work) => work.type === descriptor.workType);
  }
  return content.chapters.filter(
    (item) => workTypeFor(content, item.work) === descriptor.workType,
  );
}

export function worksOfType(content, workType) {
  return content.works.filter((work) => work.type === workType);
}

export function contentUnitLabel(workType, count = 1) {
  if (workType === WORK_TYPES.COMIC) return count === 1 ? "话" : "话";
  return count === 1 ? "章" : "章";
}
