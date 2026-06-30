import test from "node:test";
import assert from "node:assert/strict";
import {
  characterCategoryFromQuery,
  characterCategoryHref,
  workCategoryFromQuery,
  workCategoryHref,
  workTypeFromQuery,
  workTypeHref,
} from "../src/site/interaction/filters.js";
import {
  entityKey,
  normalizeArchiveState,
  normalizeLightboxItems,
  parseEntityKey,
  recordRecentState,
  resolveArchiveEntry,
  restoredListScrollTop,
  routeEntityKey,
  toggleBookmarkState,
} from "../src/site/interaction/domain.js";

test("public filters round trip through URL query parameters", () => {
  assert.equal(workTypeFromQuery("type=comic"), "漫画");
  assert.equal(workTypeFromQuery("type=missing"), "小说");
  assert.equal(workTypeHref("漫画"), "#/works?type=comic");
  const workCategories = [{ id: "long" }, { id: "short" }];
  assert.equal(workCategoryFromQuery("type=novel&category=short", workCategories), "short");
  assert.equal(workCategoryFromQuery("type=novel&category=missing", workCategories), "all");
  assert.equal(workCategoryHref("小说", "long"), "#/works?type=novel&category=long");
  assert.equal(workCategoryHref("漫画"), "#/works?type=comic");
  const categories = [{ id: "all" }, { id: "work:moon-oath" }];
  assert.equal(characterCategoryFromQuery("category=work%3Amoon-oath", categories), "work:moon-oath");
  assert.equal(characterCategoryFromQuery("category=missing", categories), "all");
  assert.equal(characterCategoryHref("work:moon-oath"), "#/characters?category=work%3Amoon-oath");
});

test("entity keys are stable across public detail types", () => {
  assert.equal(entityKey("chapter", "lantern", "moon-oath"), "chapter:moon-oath:lantern");
  assert.deepEqual(parseEntityKey("character:celia"), {
    kind: "character",
    slug: "celia",
    workSlug: "",
  });
  assert.equal(entityKey("illustration", "moon-art"), "illustration:moon-art");
  assert.deepEqual(parseEntityKey("illustration:moon-art"), {
    kind: "illustration",
    slug: "moon-art",
    workSlug: "",
  });
  assert.equal(routeEntityKey("/works/moon-oath/chapters/lantern"), "chapter:moon-oath:lantern");
});

test("bookmark storage toggles and corrupt state falls back safely", () => {
  const empty = normalizeArchiveState({ version: 0, bookmarks: "bad" });
  const added = toggleBookmarkState(empty, "work:moon-oath", 10);
  assert.deepEqual(added.bookmarks, [{ key: "work:moon-oath", savedAt: 10 }]);
  assert.deepEqual(toggleBookmarkState(added, "work:moon-oath", 20).bookmarks, []);
});

test("recent browsing deduplicates and retains twenty entries", () => {
  let state = normalizeArchiveState(null);
  for (let index = 0; index < 24; index += 1) {
    state = recordRecentState(state, `note:note-${index}`, index);
  }
  state = recordRecentState(state, "note:note-20", 100);
  assert.equal(state.recent.length, 20);
  assert.equal(state.recent[0].key, "note:note-20");
  assert.equal(state.recent.filter((entry) => entry.key === "note:note-20").length, 1);
});

test("archive resolution ignores content no longer published", () => {
  const content = {
    works: [{ slug: "moon-oath", title: "月隐之誓", cover: "cover.webp" }],
    chapters: [{ slug: "lantern", work: "moon-oath", title: "灯", status: "published" }],
    characters: [],
    notes: [],
    illustrations: [{ slug: "moon-art", title: "月光与旧誓", image: "./art.png", series: "月隐之誓", status: "published" }],
  };
  assert.equal(resolveArchiveEntry(content, { key: "chapter:moon-oath:lantern", savedAt: 1 }).title, "灯");
  assert.equal(resolveArchiveEntry(content, { key: "illustration:moon-art", savedAt: 1 }).kindLabel, "插画");
  assert.equal(resolveArchiveEntry(content, { key: "note:missing", savedAt: 1 }), null);
});

test("list scroll restores only for browser history navigation", () => {
  assert.equal(restoredListScrollTop("history", "/characters", "640"), 640);
  assert.equal(restoredListScrollTop("history", "/illustrations", "320"), 320);
  assert.equal(restoredListScrollTop("direct", "/characters", "640"), 0);
  assert.equal(restoredListScrollTop("history", "/works/moon-oath", "640"), 0);
});

test("lightbox groups discard invalid sources and normalize labels", () => {
  assert.deepEqual(normalizeLightboxItems([
    { src: "one.webp", alt: "第一张" },
    { src: "", alt: "缺失" },
  ]), [{ src: "one.webp", alt: "第一张", caption: "第一张" }]);
});
