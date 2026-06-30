export function getWork(content, slug) {
  return content.works.find((work) => work.slug === slug);
}

export function getItem(content, kind, slug) {
  const collection =
    kind === "chapter"
      ? content.chapters
      : kind === "character"
        ? content.characters
        : content.notes;
  return collection.find((item) => item.slug === slug);
}

export function visibleWorks(content) {
  return content.works.filter((work) => !work.hidden);
}

export function createContentIndex(content) {
  const works = visibleWorks(content);
  return {
    works,
    worksBySlug: new Map(works.map((work) => [work.slug, work])),
    workTitles: new Map(works.map((work) => [work.slug, work.title])),
    workTypes: new Map(works.map((work) => [work.slug, work.type])),
    visibleWorkSlugs: new Set(works.map((work) => work.slug)),
  };
}

export function publishedItems(items) {
  return items.filter((item) => item.status === "published");
}

export function publishedItemsForVisibleWorks(items, index) {
  return items.filter(
    (item) =>
      item.status === "published" &&
      index.visibleWorkSlugs.has(item.work),
  );
}

export function publishedCharactersForVisibleWorksOrNone(items, index) {
  return items.filter(
    (item) =>
      item.status === "published" &&
      (!item.work || index.visibleWorkSlugs.has(item.work)),
  );
}
