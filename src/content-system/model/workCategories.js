import { WORK_TYPES } from "./contentTypes.js";

export const WORK_CATEGORY_KEYS = ["novel", "comic"];

const defaultCategoryItems = [
  { id: "long", label: "长篇" },
  { id: "medium", label: "中篇" },
  { id: "short", label: "短篇" },
];

function cloneDefaultCategoryItems() {
  return defaultCategoryItems.map((item) => ({ ...item }));
}

export function defaultWorkCategories() {
  return {
    novel: cloneDefaultCategoryItems(),
    comic: cloneDefaultCategoryItems(),
  };
}

export function workCategoryKeyForType(workType) {
  return workType === WORK_TYPES.COMIC ? "comic" : "novel";
}

export function workTypeForCategoryKey(categoryKey) {
  return categoryKey === "comic" ? WORK_TYPES.COMIC : WORK_TYPES.NOVEL;
}

export function normalizeWorkCategories(value) {
  if (value === undefined) return defaultWorkCategories();
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const defaults = defaultWorkCategories();
  return {
    novel: value.novel === undefined ? defaults.novel : value.novel,
    comic: value.comic === undefined ? defaults.comic : value.comic,
  };
}

export function workCategoriesForType(workCategories, workType) {
  const categories = workCategories?.[workCategoryKeyForType(workType)];
  return Array.isArray(categories) ? categories : [];
}

export function moveWorkCategory(categories, categoryId, direction) {
  const currentIndex = categories.findIndex((item) => item.id === categoryId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= categories.length) return categories;
  const next = [...categories];
  [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
  return next;
}

export function deleteWorkCategory(content, categoryKey, categoryId) {
  const workType = workTypeForCategoryKey(categoryKey);
  return {
    ...content,
    site: {
      ...content.site,
      workCategories: {
        ...content.site.workCategories,
        [categoryKey]: (content.site.workCategories?.[categoryKey] || [])
          .filter((item) => item.id !== categoryId),
      },
    },
    works: (content.works || []).map((work) =>
      work.type === workType && work.workCategory === categoryId
        ? { ...work, workCategory: "" }
        : work,
    ),
  };
}
