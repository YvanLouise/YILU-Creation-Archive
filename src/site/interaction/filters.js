const workTypes = {
  novel: "小说",
  comic: "漫画",
};

export function workTypeFromQuery(queryString) {
  return workTypes[new URLSearchParams(queryString).get("type")] || "小说";
}

export function workTypeHref(type) {
  const value = type === "漫画" ? "comic" : "novel";
  return `#/works?type=${value}`;
}

export function workCategoryFromQuery(queryString, categories) {
  const requested = new URLSearchParams(queryString).get("category") || "all";
  return categories.some((item) => item.id === requested) ? requested : "all";
}

export function workCategoryHref(type, categoryId = "all") {
  const value = type === "漫画" ? "comic" : "novel";
  return categoryId === "all"
    ? `#/works?type=${value}`
    : `#/works?type=${value}&category=${encodeURIComponent(categoryId)}`;
}

export function characterCategoryFromQuery(queryString, categories) {
  const requested = new URLSearchParams(queryString).get("category") || "all";
  return categories.some((item) => item.id === requested) ? requested : "all";
}

export function characterCategoryHref(category) {
  return category === "all"
    ? "#/characters"
    : `#/characters?category=${encodeURIComponent(category)}`;
}
