function parseScalar(raw) {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    try {
      return JSON.parse(value);
    } catch {
      // Keep supporting the existing lightweight unquoted array syntax.
    }
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value.replace(/^["']|["']$/g, "");
}

export function parseMarkdownFile(source) {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { meta: {}, body: normalized.trim() };
  }
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) throw new Error("Markdown frontmatter 未闭合");
  const meta = {};
  for (const line of normalized.slice(4, end).split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    meta[key] = parseScalar(line.slice(separator + 1));
  }
  return { meta, body: normalized.slice(end + 5).trim() };
}

function stringifyScalar(value) {
  if (Array.isArray(value)) {
    return value.some((item) => item && typeof item === "object")
      ? JSON.stringify(value)
      : `[${value.join(", ")}]`;
  }
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return String(value ?? "").replaceAll("\n", " ");
}

export function stringifyMarkdownFile(meta, body) {
  const preferredOrder = [
    "title",
    "slug",
    "summary",
    "date",
    "createdAt",
    "status",
    "order",
    "work",
    "volume",
    "sections",
    "role",
    "affiliation",
    "profileStatus",
    "aliases",
    "traits",
    "abilities",
    "timeline",
    "relationships",
    "gallery",
    "relatedWork",
    "category",
    "tags",
    "pinned",
    "cover",
  ];
  const keys = [
    ...preferredOrder.filter((key) => Object.hasOwn(meta, key)),
    ...Object.keys(meta).filter((key) => !preferredOrder.includes(key)),
  ];
  const header = keys.map((key) => `${key}: ${stringifyScalar(meta[key])}`).join("\n");
  return `---\n${header}\n---\n\n${body.trim()}\n`;
}
