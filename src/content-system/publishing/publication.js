export function stampFirstPublication(content, now = new Date().toISOString()) {
  const next = structuredClone(content);
  next.works = next.works.map((work) =>
    !work.hidden && !work.createdAt ? { ...work, createdAt: now } : work,
  );
  const publicWorkSlugs = new Set(
    next.works.filter((work) => !work.hidden).map((work) => work.slug),
  );
  const stampItems = (items, requiresWork) => items.map((item) => {
    const isPublic =
      item.status === "published" &&
      (!requiresWork || publicWorkSlugs.has(item.work));
    return isPublic && !item.createdAt ? { ...item, createdAt: now } : item;
  });
  next.chapters = stampItems(next.chapters, true);
  next.characters = stampItems(next.characters, true);
  next.notes = stampItems(next.notes, false);
  return next;
}
