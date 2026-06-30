const storageVersion = 1;
export const archiveStorageKey = "ilu-public-archive-v1";
export const scrollStoragePrefix = "ilu-public-scroll";

export function entityKey(kind, slug, workSlug = "") {
  if (kind === "chapter") return `chapter:${workSlug}:${slug}`;
  return `${kind}:${slug}`;
}

export function parseEntityKey(key) {
  const [kind, first, second] = String(key || "").split(":");
  if (kind === "chapter" && first && second) {
    return { kind, workSlug: first, slug: second };
  }
  if (["work", "character", "note", "illustration"].includes(kind) && first) {
    return { kind, slug: first, workSlug: "" };
  }
  return null;
}

export function normalizeArchiveState(value) {
  if (!value || typeof value !== "object" || value.version !== storageVersion) {
    return { version: storageVersion, bookmarks: [], recent: [] };
  }
  const normalizeEntries = (entries, limit) => {
    const seen = new Set();
    return (Array.isArray(entries) ? entries : [])
      .filter((entry) => {
        if (!parseEntityKey(entry?.key) || seen.has(entry.key)) return false;
        seen.add(entry.key);
        return true;
      })
      .map((entry) => ({
        key: entry.key,
        savedAt: Number(entry.savedAt) || 0,
      }))
      .sort((left, right) => right.savedAt - left.savedAt)
      .slice(0, limit);
  };
  return {
    version: storageVersion,
    bookmarks: normalizeEntries(value.bookmarks, 100),
    recent: normalizeEntries(value.recent, 20),
  };
}

export function toggleBookmarkState(state, key, savedAt = Date.now()) {
  const current = normalizeArchiveState(state);
  const exists = current.bookmarks.some((entry) => entry.key === key);
  return {
    ...current,
    bookmarks: exists
      ? current.bookmarks.filter((entry) => entry.key !== key)
      : [{ key, savedAt }, ...current.bookmarks],
  };
}

export function recordRecentState(state, key, savedAt = Date.now()) {
  const current = normalizeArchiveState(state);
  return {
    ...current,
    recent: [
      { key, savedAt },
      ...current.recent.filter((entry) => entry.key !== key),
    ].slice(0, 20),
  };
}

export function resolveArchiveEntry(content, entry) {
  const parsed = parseEntityKey(entry?.key);
  if (!parsed) return null;
  if (parsed.kind === "work") {
    const item = content.works.find((work) => work.slug === parsed.slug && !work.hidden);
    return item ? {
      ...entry,
      kind: "work",
      kindLabel: "作品",
      title: item.title,
      image: item.cover,
      href: `#/works/${item.slug}`,
    } : null;
  }
  if (parsed.kind === "chapter") {
    const item = content.chapters.find((chapter) =>
      chapter.slug === parsed.slug
      && chapter.work === parsed.workSlug
      && chapter.status === "published");
    const work = content.works.find((candidate) => candidate.slug === parsed.workSlug && !candidate.hidden);
    return item && work ? {
      ...entry,
      kind: "chapter",
      kindLabel: work.type === "漫画" ? "漫画话数" : "小说章节",
      title: item.title,
      subtitle: work.title,
      image: item.cover || work.cover,
      href: `#/works/${work.slug}/chapters/${item.slug}`,
    } : null;
  }
  if (parsed.kind === "illustration") {
    const item = (content.illustrations || []).find((candidate) =>
      candidate.slug === parsed.slug && candidate.status === "published");
    return item ? {
      ...entry,
      kind: "illustration",
      kindLabel: "插画",
      title: item.title,
      subtitle: item.series || "",
      image: item.image || "",
      href: "#/illustrations",
    } : null;
  }
  const collection = parsed.kind === "character" ? content.characters : content.notes;
  const item = collection.find((candidate) => candidate.slug === parsed.slug && candidate.status === "published");
  return item ? {
    ...entry,
    kind: parsed.kind,
    kindLabel: parsed.kind === "character" ? "角色" : "创作笔记",
    title: item.title,
    image: item.cover || "",
    href: `#/${parsed.kind === "character" ? "characters" : "notes"}/${item.slug}`,
  } : null;
}

export function routeEntityKey(route) {
  const parts = String(route || "").split("/").filter(Boolean);
  if (parts[0] === "works" && parts.length === 2) return entityKey("work", parts[1]);
  if (parts[0] === "works" && parts[2] === "chapters" && parts.length === 4) {
    return entityKey("chapter", parts[3], parts[1]);
  }
  if (parts[0] === "characters" && parts.length === 2) return entityKey("character", parts[1]);
  if (parts[0] === "notes" && parts.length === 2) return entityKey("note", parts[1]);
  return "";
}

export function isRestorableListRoute(route) {
  return ["/works", "/characters", "/illustrations", "/notes", "/updates", "/search"].includes(route);
}

export function scrollStorageKey(locationKey) {
  return `${scrollStoragePrefix}:${locationKey}`;
}

export function restoredListScrollTop(navigationType, route, storedValue) {
  if (navigationType !== "history" || !isRestorableListRoute(route)) return 0;
  return Math.max(0, Number(storedValue) || 0);
}

export function normalizeLightboxItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => typeof item?.src === "string" && item.src)
    .map((item) => ({
      src: item.src,
      alt: String(item.alt || ""),
      caption: String(item.caption || item.alt || ""),
    }));
}
