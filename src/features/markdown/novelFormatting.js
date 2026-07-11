export const novelInlineFormats = new Set(["hide", "blur", "thought", "aside"]);

function nextIndex(source, token, from) {
  const index = source.indexOf(token, from);
  return index < 0 ? Number.POSITIVE_INFINITY : index;
}

function firstMatch(source, cursor) {
  const candidates = [
    { type: "strike", index: nextIndex(source, "~~", cursor) },
    { type: "mark", index: nextIndex(source, "==", cursor) },
    { type: "novel", index: nextIndex(source, "{{", cursor) },
    { type: "link", index: nextIndex(source, "[", cursor) },
  ].sort((left, right) => left.index - right.index);
  return Number.isFinite(candidates[0].index) ? candidates[0] : null;
}

export function parseNovelInline(source) {
  const text = String(source || "");
  const tokens = [];
  let cursor = 0;

  while (cursor < text.length) {
    const match = firstMatch(text, cursor);
    if (!match) {
      tokens.push({ type: "text", text: text.slice(cursor) });
      break;
    }
    if (match.index > cursor) tokens.push({ type: "text", text: text.slice(cursor, match.index) });

    if (match.type === "strike" || match.type === "mark") {
      const marker = match.type === "strike" ? "~~" : "==";
      const end = text.indexOf(marker, match.index + marker.length);
      if (end < 0) {
        tokens.push({ type: "text", text: text.slice(match.index, match.index + marker.length) });
        cursor = match.index + marker.length;
        continue;
      }
      tokens.push({ type: match.type, text: text.slice(match.index + marker.length, end) });
      cursor = end + marker.length;
      continue;
    }

    if (match.type === "novel") {
      const close = text.indexOf("}}", match.index + 2);
      const colon = text.indexOf(":", match.index + 2);
      if (close < 0 || colon < 0 || colon > close) {
        tokens.push({ type: "text", text: text.slice(match.index, match.index + 2) });
        cursor = match.index + 2;
        continue;
      }
      const format = text.slice(match.index + 2, colon).trim();
      if (!novelInlineFormats.has(format)) {
        tokens.push({ type: "text", text: text.slice(match.index, close + 2) });
        cursor = close + 2;
        continue;
      }
      tokens.push({ type: format, text: text.slice(colon + 1, close) });
      cursor = close + 2;
      continue;
    }

    const link = text.slice(match.index).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (link) {
      tokens.push({ type: "link", text: link[1], href: link[2] });
      cursor = match.index + link[0].length;
      continue;
    }
    tokens.push({ type: "text", text: text.slice(match.index, match.index + 1) });
    cursor = match.index + 1;
  }

  return tokens.filter((token) => token.text || token.type === "link");
}

export function splitNovelBlocks(lines) {
  const sourceLines = Array.isArray(lines) ? lines : String(lines || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < sourceLines.length) {
    const line = sourceLines[index];
    const opening = line.trim().match(/^:::(notice|letter)(?:\s+(.+))?$/);
    if (!opening) {
      blocks.push({ type: "line", line });
      index += 1;
      continue;
    }

    const closeIndex = sourceLines.findIndex((candidate, candidateIndex) => (
      candidateIndex > index && candidate.trim() === ":::"
    ));
    if (closeIndex < 0) {
      blocks.push({ type: "line", line });
      index += 1;
      continue;
    }

    blocks.push({
      type: opening[1],
      title: opening[2] || "",
      body: sourceLines.slice(index + 1, closeIndex).join("\n"),
    });
    index = closeIndex + 1;
  }

  return blocks;
}

export function stripNovelFormatting(value) {
  return String(value || "")
    .replace(/^:::(notice|letter)(?:\s+(.+))?$/gm, " $2 ")
    .replace(/^:::$/gm, " ")
    .replace(/~~([^~]+)~~/g, " $1 ")
    .replace(/==([^=]+)==/g, " $1 ")
    .replace(/\{\{(?:hide|blur|thought|aside):([^}]+)\}\}/g, " $1 ");
}
