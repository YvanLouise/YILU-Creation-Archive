const storagePrefix = "ilu-reader-position";

export function readingPositionKey(workSlug, chapterSlug) {
  return `${storagePrefix}:${workSlug}:${chapterSlug}`;
}

export function createReadingPosition(scrollTop, scrollHeight, viewportHeight) {
  const maximum = Math.max(0, scrollHeight - viewportHeight);
  const top = Math.max(0, Math.min(Number(scrollTop) || 0, maximum));
  return {
    top,
    maximum,
    ratio: maximum > 0 ? top / maximum : 0,
    savedAt: Date.now(),
  };
}

export function parseReadingPosition(value) {
  if (!value || typeof value !== "object") return null;
  const top = Number(value.top);
  const maximum = Number(value.maximum);
  const ratio = Number(value.ratio);
  if (![top, maximum, ratio].every(Number.isFinite)) return null;
  return {
    top: Math.max(0, top),
    maximum: Math.max(0, maximum),
    ratio: Math.max(0, Math.min(1, ratio)),
    savedAt: Number(value.savedAt) || 0,
  };
}

export function restoredScrollTop(position, scrollHeight, viewportHeight) {
  const parsed = parseReadingPosition(position);
  if (!parsed) return 0;
  const maximum = Math.max(0, scrollHeight - viewportHeight);
  if (!maximum) return 0;
  return Math.round(Math.min(parsed.top, maximum));
}

export function readReadingPosition(storage, workSlug, chapterSlug) {
  try {
    return parseReadingPosition(JSON.parse(storage.getItem(readingPositionKey(workSlug, chapterSlug)) || "null"));
  } catch {
    return null;
  }
}

export function writeReadingPosition(storage, workSlug, chapterSlug, position) {
  storage.setItem(
    readingPositionKey(workSlug, chapterSlug),
    JSON.stringify(position),
  );
}
