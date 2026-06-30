import {
  createContentIndex,
  publishedCharactersForVisibleWorksOrNone,
  publishedItems,
  publishedItemsForVisibleWorks,
} from "../../content-system/query/selectors.js";
import { publicChapterBody } from "../../content-system/model/novelStructure.js";

const kindLabels = {
  work: "作品",
  chapter: "章节",
  character: "角色",
  note: "创作笔记",
  illustration: "插画",
};

export function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripMarkdown(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, " $1 ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
    .replace(/<[^>]*>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeQuery(query) {
  return [...new Set(normalizeSearchText(query).split(" ").filter(Boolean))];
}

function makeDocument(item) {
  const body = stripMarkdown(item.body);
  const metadata = normalizeSearchText(item.metadata);
  const titleText = normalizeSearchText(item.title);
  const summaryText = normalizeSearchText(item.summary);
  const bodyText = normalizeSearchText(body);
  return {
    ...item,
    body,
    kindLabel: item.kindLabel || kindLabels[item.kind],
    titleText,
    summaryText,
    metadataText: metadata,
    bodyText,
    searchText: normalizeSearchText([item.title, item.summary, item.metadata, body].join(" ")),
  };
}

export function buildSearchDocuments(content) {
  const index = createContentIndex(content);
  const worksBySlug = new Map(content.works.map((work) => [work.slug, work]));

  return [
    ...index.works.map((work) => makeDocument({
      kind: "work",
      slug: work.slug,
      title: work.title,
      summary: work.description,
      body: "",
      metadata: [work.subtitle, work.type, work.status, work.progress, ...(work.genre || [])].join(" "),
      href: `#/works/${work.slug}`,
      workTitle: "",
      date: "",
      order: work.order,
    })),
    ...publishedItemsForVisibleWorks(content.chapters, index)
      .map((item) => makeDocument({
        ...item,
        body: publicChapterBody(worksBySlug.get(item.work), item),
        kindLabel: index.workTypes.get(item.work) === "漫画" ? "漫画话数" : "小说章节",
        metadata: index.workTitles.get(item.work),
        href: `#/works/${item.work}/chapters/${item.slug}`,
        workTitle: index.workTitles.get(item.work) || "",
      })),
    ...publishedCharactersForVisibleWorksOrNone(content.characters, index)
      .map((item) => makeDocument({
        ...item,
        metadata: [
          index.workTitles.get(item.work),
          item.role,
          item.affiliation,
          item.profileStatus,
          ...(item.aliases || []),
          ...(item.traits || []),
          ...(item.abilities || []).flatMap((entry) => [entry.name, entry.description]),
          ...(item.timeline || []).flatMap((entry) => [entry.label, entry.description]),
          ...(item.relationships || []).flatMap((entry) => [entry.label, entry.description]),
          ...(item.gallery || []).map((entry) => entry.label),
        ].join(" "),
        href: `#/characters/${item.slug}`,
        workTitle: index.workTitles.get(item.work) || "",
      })),
    ...publishedItems(content.notes)
      .map((item) => makeDocument({
        ...item,
        metadata: [
          item.category,
          ...(Array.isArray(item.tags) ? item.tags : []),
          index.workTitles.get(item.relatedWork) || "",
        ].join(" "),
        href: `#/notes/${item.slug}`,
        workTitle: index.workTitles.get(item.relatedWork) || "",
      })),
    ...publishedItems(content.illustrations || [])
      .map((item) => makeDocument({
        ...item,
        kind: "illustration",
        summary: item.summary,
        body: "",
        metadata: [item.category, item.series].join(" "),
        href: "#/illustrations",
        workTitle: item.series || "",
        image: item.image,
      })),
  ];
}

export function scoreSearchDocument(document, query, tokens = tokenizeQuery(query)) {
  if (!tokens.length || !tokens.every((token) => document.searchText.includes(token))) return -1;
  const normalizedQuery = normalizeSearchText(query);
  let score = 0;
  if (document.titleText === normalizedQuery) score += 1000;
  if (tokens.every((token) => document.titleText.includes(token))) score += 500;
  for (const token of tokens) {
    if (document.titleText.includes(token)) score += 120;
    if (document.summaryText.includes(token)) score += 55;
    if (document.metadataText.includes(token)) score += 35;
    if (document.bodyText.includes(token)) score += 10;
  }
  return score;
}

function compareDateDescending(left, right) {
  return String(right.date || "").localeCompare(String(left.date || ""));
}

export function searchDocuments(documents, query, type = "all") {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return [];
  return documents
    .filter((document) => type === "all" || document.kind === type)
    .map((document) => ({ ...document, score: scoreSearchDocument(document, query, tokens) }))
    .filter((document) => document.score >= 0)
    .sort((left, right) =>
      right.score - left.score ||
      (left.order || Number.MAX_SAFE_INTEGER) - (right.order || Number.MAX_SAFE_INTEGER) ||
      compareDateDescending(left, right));
}

export function extractSearchSnippet(document, query, maxLength = 118) {
  const tokens = tokenizeQuery(query);
  const candidates = [document.summary, document.body].filter(Boolean);
  let source = candidates.find((value) => {
    const normalized = normalizeSearchText(value);
    return tokens.some((token) => normalized.includes(token));
  }) || document.summary || document.body || "";
  source = stripMarkdown(source);
  if (source.length <= maxLength) return source;

  const normalized = normalizeSearchText(source);
  const positions = tokens
    .map((token) => normalized.indexOf(token))
    .filter((position) => position >= 0);
  const firstMatch = positions.length ? Math.min(...positions) : 0;
  const start = Math.max(0, firstMatch - Math.floor(maxLength / 3));
  const end = Math.min(source.length, start + maxLength);
  return `${start > 0 ? "…" : ""}${source.slice(start, end).trim()}${end < source.length ? "…" : ""}`;
}

export function highlightSearchText(value, query) {
  const tokens = tokenizeQuery(query).sort((left, right) => right.length - left.length);
  if (!tokens.length) return [{ text: String(value || ""), match: false }];
  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "giu");
  return String(value || "")
    .split(pattern)
    .filter(Boolean)
    .map((text) => ({
      text,
      match: tokens.includes(normalizeSearchText(text)),
    }));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
