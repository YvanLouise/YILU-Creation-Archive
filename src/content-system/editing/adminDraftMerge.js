import {
  normalizeChapterStructureConfig,
  normalizeSections,
  normalizeVolumes,
} from "../model/novelStructure.js";

function bySlug(items = []) {
  return new Map(items.map((item) => [item.slug, item]));
}

function mergeBySlug(repositoryItems = [], draftItems = [], mergeItem = (repositoryItem, draftItem) => ({ ...repositoryItem, ...draftItem })) {
  const draftBySlug = bySlug(draftItems);
  const merged = repositoryItems.map((repositoryItem) => {
    const draftItem = draftBySlug.get(repositoryItem.slug);
    if (!draftItem) return repositoryItem;
    draftBySlug.delete(repositoryItem.slug);
    return mergeItem(repositoryItem, draftItem);
  });
  return [...merged, ...draftBySlug.values()];
}

function workHasChapterVolumes(workSlug, chapters = []) {
  return chapters.some((chapter) => chapter.work === workSlug && chapter.volume);
}

function workHasChapterSections(workSlug, chapters = []) {
  return chapters.some((chapter) => chapter.work === workSlug && normalizeSections(chapter.sections).length);
}

function mergeWork(repositoryWork, draftWork, mergedChapters) {
  const repositoryStructure = normalizeChapterStructureConfig(repositoryWork.chapterStructure);
  const draftStructure = normalizeChapterStructureConfig(draftWork.chapterStructure);
  const repositoryVolumes = normalizeVolumes(repositoryWork.volumes);
  const draftVolumes = normalizeVolumes(draftWork.volumes);
  const volumes = draftVolumes.length ? draftVolumes : repositoryVolumes;
  const hasVolumeData = volumes.length || workHasChapterVolumes(draftWork.slug, mergedChapters);
  const hasSectionData = workHasChapterSections(draftWork.slug, mergedChapters);

  return {
    ...repositoryWork,
    ...draftWork,
    chapterStructure: {
      ...repositoryStructure,
      ...draftStructure,
      enableVolumes: repositoryStructure.enableVolumes || draftStructure.enableVolumes || hasVolumeData,
      enableSections: repositoryStructure.enableSections || draftStructure.enableSections || hasSectionData,
    },
    volumes,
  };
}

function mergeChapter(repositoryChapter, draftChapter) {
  const repositorySections = normalizeSections(repositoryChapter.sections);
  const draftSections = normalizeSections(draftChapter.sections);
  return {
    ...repositoryChapter,
    ...draftChapter,
    volume: draftChapter.volume || repositoryChapter.volume || "",
    sections: draftSections.length ? draftSections : repositorySections,
  };
}

export function mergeDraftWithRepository(repositoryContent, draftContent) {
  if (!draftContent) return repositoryContent;
  const mergedChapters = mergeBySlug(repositoryContent.chapters, draftContent.chapters, mergeChapter);
  return {
    ...repositoryContent,
    ...draftContent,
    site: {
      ...repositoryContent.site,
      ...draftContent.site,
    },
    works: mergeBySlug(repositoryContent.works, draftContent.works, (repositoryWork, draftWork) =>
      mergeWork(repositoryWork, draftWork, mergedChapters),
    ),
    chapters: mergedChapters,
    characters: mergeBySlug(repositoryContent.characters, draftContent.characters),
    illustrations: mergeBySlug(repositoryContent.illustrations, draftContent.illustrations),
    notes: mergeBySlug(repositoryContent.notes, draftContent.notes),
  };
}
