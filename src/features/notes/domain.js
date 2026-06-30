import {
  createContentIndex,
  publishedItems,
} from "../../content-system/query/selectors.js";

function dateDescending(left, right) {
  return String(right.date || "").localeCompare(String(left.date || ""));
}

function normalizeFilter(value) {
  return String(value || "").trim();
}

export function noteCategory(note) {
  return normalizeFilter(note.category) || "创作笔记";
}

export function noteTags(note) {
  return Array.isArray(note.tags)
    ? note.tags.map(normalizeFilter).filter(Boolean)
    : [];
}

export function sortPublicNotes(notes) {
  return [...notes].sort((left, right) =>
    Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)) ||
    dateDescending(left, right) ||
    left.order - right.order ||
    left.title.localeCompare(right.title, "zh-CN"));
}

export function publicNotes(content) {
  return sortPublicNotes(publishedItems(content.notes || []));
}

export function noteTaxonomy(notes) {
  const categories = new Set();
  const tags = new Set();
  for (const note of notes) {
    categories.add(noteCategory(note));
    noteTags(note).forEach((tag) => tags.add(tag));
  }
  return {
    categories: [...categories].sort((left, right) => left.localeCompare(right, "zh-CN")),
    tags: [...tags].sort((left, right) => left.localeCompare(right, "zh-CN")),
  };
}

export function filterNotes(notes, { category = "", tag = "" } = {}) {
  const selectedCategory = normalizeFilter(category);
  const selectedTag = normalizeFilter(tag);
  return notes.filter((note) =>
    (!selectedCategory || noteCategory(note) === selectedCategory) &&
    (!selectedTag || noteTags(note).includes(selectedTag)));
}

export function resolveNotesView(content, queryString = "") {
  const params = new URLSearchParams(queryString);
  const notes = publicNotes(content);
  const taxonomy = noteTaxonomy(notes);
  const category = normalizeFilter(params.get("category"));
  const tag = normalizeFilter(params.get("tag"));
  return {
    notes,
    filteredNotes: filterNotes(notes, { category, tag }),
    taxonomy,
    selectedCategory: taxonomy.categories.includes(category) ? category : "",
    selectedTag: taxonomy.tags.includes(tag) ? tag : "",
  };
}

export function resolveHomeNotes(content, limit = 2) {
  return publicNotes(content).slice(0, limit);
}

export function relatedWorkForNote(content, note) {
  if (!note.relatedWork) return null;
  const index = createContentIndex(content);
  return index.worksBySlug.get(note.relatedWork) || null;
}

export function noteFilterHref({ category = "", tag = "" } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (tag) params.set("tag", tag);
  const query = params.toString();
  return query ? `#/notes?${query}` : "#/notes";
}
