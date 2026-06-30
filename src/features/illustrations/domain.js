export const illustrationSortModes = [
  { id: "latest", label: "最新优先" },
  { id: "oldest", label: "最早优先" },
  { id: "order", label: "归档排序" },
];

export function publishedIllustrations(content) {
  return (content.illustrations || []).filter((item) => item.status === "published");
}

export function illustrationCategoriesFor(items) {
  return [...new Set(
    (items || [])
      .map((item) => String(item.category || "").trim())
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function parseIllustrationQuery(queryString = "", categories = []) {
  const params = new URLSearchParams(queryString);
  const category = params.get("category") || "all";
  const sort = params.get("sort") || "latest";
  return {
    category: category === "all" || categories.includes(category) ? category : "all",
    sort: illustrationSortModes.some((item) => item.id === sort) ? sort : "latest",
  };
}

export function illustrationQueryHref({ category = "all", sort = "latest" } = {}) {
  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (sort !== "latest") params.set("sort", sort);
  const query = params.toString();
  return `#/illustrations${query ? `?${query}` : ""}`;
}

function compareDate(left, right) {
  return String(right.date || "").localeCompare(String(left.date || ""));
}

export function sortIllustrations(items, sort = "latest") {
  return [...items].sort((left, right) => {
    if (sort === "oldest") {
      return String(left.date || "").localeCompare(String(right.date || "")) ||
        left.order - right.order ||
        left.title.localeCompare(right.title, "zh-CN");
    }
    if (sort === "order") {
      return left.order - right.order ||
        compareDate(left, right) ||
        left.title.localeCompare(right.title, "zh-CN");
    }
    return compareDate(left, right) ||
      left.order - right.order ||
      left.title.localeCompare(right.title, "zh-CN");
  });
}

export function resolveIllustrationsView(content, queryString = "") {
  const allItems = publishedIllustrations(content);
  const categories = illustrationCategoriesFor(allItems);
  const { category, sort } = parseIllustrationQuery(queryString, categories);
  const filtered = category === "all"
    ? allItems
    : allItems.filter((item) => item.category === category);
  const sorted = sortIllustrations(filtered, sort);
  const featured = sortIllustrations(
    allItems.filter((item) => item.featured),
    "order",
  );
  const fallbackFeatured = sortIllustrations(allItems, "latest")[0] || null;
  const featuredItems = featured.length ? featured : (fallbackFeatured ? [fallbackFeatured] : []);
  return {
    category,
    categories,
    featured: featuredItems[0] || null,
    featuredItems,
    items: sorted,
    sort,
    total: allItems.length,
  };
}
