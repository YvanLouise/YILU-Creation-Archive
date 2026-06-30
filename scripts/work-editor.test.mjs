import test from "node:test";
import assert from "node:assert/strict";
import { itemsForSection } from "../src/content-system/model/contentTypes.js";
import {
  deleteWorkCategory,
  moveWorkCategory,
} from "../src/content-system/model/workCategories.js";
import {
  assignChapterVolume,
  coverPathFromMedia,
  convertWorkType,
  deleteVolume,
  getWorkDeleteBlockers,
  migrateChapterBodyToFirstSection,
  moveChapterToVolume,
  moveCollectionItem,
  moveSectionBy,
  moveSectionTo,
  moveVolumeBy,
  newSection,
  newVolume,
  normalizeWorkOrdersByType,
  reorderCategoryItems,
  renameWorkSlug,
  resolveWorkCover,
  sectionWordCount,
} from "../src/content-system/editing/workEditor.js";

function fixture() {
  return {
    site: { featuredWorkSlug: "first" },
    works: [
      { slug: "first", order: 1 },
      { slug: "second", order: 2 },
      { slug: "third", order: 3 },
    ],
    chapters: [{ slug: "chapter-1", work: "first" }],
    characters: [{ slug: "character-1", work: "first" }],
  };
}

test("work slug rename migrates every association", () => {
  const renamed = renameWorkSlug(fixture(), "first", "renamed-work");
  assert.equal(renamed.works[0].slug, "renamed-work");
  assert.equal(renamed.chapters[0].work, "renamed-work");
  assert.equal(renamed.characters[0].work, "renamed-work");
  assert.equal(renamed.site.featuredWorkSlug, "renamed-work");
});

test("work slug rename rejects invalid and duplicate values", () => {
  assert.throws(() => renameWorkSlug(fixture(), "first", "../bad"));
  assert.throws(() => renameWorkSlug(fixture(), "first", "second"));
});

test("drag sorting produces continuous order values", () => {
  const moved = moveCollectionItem(fixture().works, "third", "first");
  assert.deepEqual(moved.map((item) => item.slug), ["third", "first", "second"]);
  assert.deepEqual(moved.map((item) => item.order), [1, 2, 3]);
});

test("category sorting leaves the other work type in place", () => {
  const all = [
    { slug: "novel-a", type: "小说", order: 1 },
    { slug: "comic-a", type: "漫画", order: 1 },
    { slug: "novel-b", type: "小说", order: 2 },
  ];
  const novels = all.filter((item) => item.type === "小说");
  const reordered = reorderCategoryItems(all, novels, moveCollectionItem(novels, "novel-b", "novel-a"));
  assert.deepEqual(reordered.map((item) => item.slug), ["novel-b", "comic-a", "novel-a"]);
  assert.deepEqual(reordered.filter((item) => item.type === "小说").map((item) => item.order), [1, 2]);
});

test("work order normalization fixes duplicate orders per type", () => {
  const content = {
    ...fixture(),
    works: [
      { slug: "novel-a", type: "小说", order: 1 },
      { slug: "comic-a", type: "漫画", order: 1 },
      { slug: "novel-b", type: "小说", order: 1 },
      { slug: "comic-b", type: "漫画", order: 1 },
    ],
  };
  const normalized = normalizeWorkOrdersByType(content);
  assert.deepEqual(normalized.works.filter((item) => item.type === "小说").map((item) => item.order), [1, 2]);
  assert.deepEqual(normalized.works.filter((item) => item.type === "漫画").map((item) => item.order), [1, 2]);
});

test("controlled type conversion appends to target category", () => {
  const content = {
    ...fixture(),
    works: [
      { slug: "first", type: "小说", order: 1, workCategory: "long" },
      { slug: "comic", type: "漫画", order: 1 },
    ],
  };
  const converted = convertWorkType(content, "first", "漫画");
  const work = converted.works.find((item) => item.slug === "first");
  assert.equal(work.type, "漫画");
  assert.equal(work.order, 2);
  assert.equal(work.readingMode, "vertical");
  assert.equal(work.workCategory, "");
  assert.deepEqual(converted.works.filter((item) => item.type === "漫画").map((item) => item.slug), ["comic", "first"]);
});

test("work categories reorder independently and deletion keeps works", () => {
  const categories = [
    { id: "long", label: "长篇" },
    { id: "medium", label: "中篇" },
    { id: "short", label: "短篇" },
  ];
  assert.deepEqual(
    moveWorkCategory(categories, "short", -1).map((item) => item.id),
    ["long", "short", "medium"],
  );

  const content = {
    site: {
      workCategories: {
        novel: categories,
        comic: [{ id: "long", label: "长篇" }],
      },
    },
    works: [
      { slug: "novel", type: "小说", workCategory: "long" },
      { slug: "comic", type: "漫画", workCategory: "long" },
      { slug: "uncategorized", type: "小说", workCategory: "" },
    ],
  };
  const deleted = deleteWorkCategory(content, "novel", "long");
  assert.deepEqual(deleted.site.workCategories.novel.map((item) => item.id), ["medium", "short"]);
  assert.equal(deleted.works.find((item) => item.slug === "novel").workCategory, "");
  assert.equal(deleted.works.find((item) => item.slug === "comic").workCategory, "long");
  assert.equal(deleted.works.length, 3);
});

test("admin sections filter works and updates by associated work type", () => {
  const content = {
    site: { featuredWorkSlug: "novel" },
    works: [
      { slug: "novel", type: "小说" },
      { slug: "comic", type: "漫画" },
    ],
    chapters: [
      { slug: "chapter", work: "novel" },
      { slug: "episode", work: "comic" },
    ],
  };
  assert.deepEqual(itemsForSection(content, "novels").map((item) => item.slug), ["novel"]);
  assert.deepEqual(itemsForSection(content, "comicEpisodes").map((item) => item.slug), ["episode"]);
});

test("delete blockers include content and featured status", () => {
  assert.deepEqual(
    getWorkDeleteBlockers(fixture(), "first"),
    ["1 个章节", "1 个角色", "首页主推作品"],
  );
  assert.deepEqual(getWorkDeleteBlockers(fixture(), "second"), []);
});

test("draft media path and preview source are resolved consistently", () => {
  const media = {
    id: "image",
    path: "public/uploads/2026/06/image.webp",
    data: "data:image/webp;base64,abc",
  };
  assert.equal(coverPathFromMedia(media), "./uploads/2026/06/image.webp");
  assert.equal(resolveWorkCover("./uploads/2026/06/image.webp", [media]), media.data);
});

test("volume helpers keep chapter assignments without deleting data", () => {
  const first = { ...newVolume([]), id: "volume-a", title: "第一卷", order: 1 };
  const second = { ...newVolume([first]), id: "volume-b", title: "第二卷", order: 2 };
  assert.deepEqual(moveVolumeBy([first, second], "volume-b", -1).map((item) => item.id), ["volume-b", "volume-a"]);

  const assigned = assignChapterVolume({
    ...fixture(),
    chapters: [{ slug: "chapter-1", work: "first", volume: "" }],
  }, "chapter-1", "volume-a");
  assert.equal(assigned.chapters[0].volume, "volume-a");

  const unassigned = assignChapterVolume(assigned, "chapter-1", "");
  assert.equal(unassigned.chapters[0].volume, "");

  const removed = deleteVolume({
    ...fixture(),
    works: [{ slug: "first", volumes: [first, second] }],
    chapters: [
      { slug: "chapter-1", work: "first", volume: "volume-a" },
      { slug: "chapter-2", work: "first", volume: "volume-b" },
      { slug: "chapter-3", work: "second", volume: "volume-a" },
    ],
  }, "first", "volume-a");
  assert.deepEqual(removed.works[0].volumes.map((item) => item.id), ["volume-b"]);
  assert.equal(removed.chapters[0].volume, "");
  assert.equal(removed.chapters[1].volume, "volume-b");
  assert.equal(removed.chapters[2].volume, "volume-a");
});

test("chapter volume drag can move and reorder chapters in one operation", () => {
  const content = {
    ...fixture(),
    chapters: [
      { slug: "chapter-1", work: "first", volume: "volume-a", order: 1 },
      { slug: "chapter-2", work: "first", volume: "volume-a", order: 2 },
      { slug: "chapter-3", work: "first", volume: "volume-b", order: 3 },
      { slug: "other-work", work: "second", volume: "", order: 1 },
    ],
  };

  const moved = moveChapterToVolume(content, "first", "chapter-3", "volume-a", "chapter-2");

  assert.deepEqual(
    moved.chapters.filter((item) => item.work === "first").map((item) => [item.slug, item.volume, item.order]),
    [
      ["chapter-1", "volume-a", 1],
      ["chapter-3", "volume-a", 2],
      ["chapter-2", "volume-a", 3],
    ],
  );
  assert.deepEqual(
    moved.chapters.find((item) => item.slug === "other-work"),
    { slug: "other-work", work: "second", volume: "", order: 1 },
  );
});

test("section helpers create, sort, and count structured chapter sections", () => {
  const first = { ...newSection([]), id: "section-a", title: "一", order: 1, body: "雨夜归来", anchor: "section-1" };
  const second = { ...newSection([first]), id: "section-b", title: "二", order: 2, body: "钟楼之下", anchor: "section-2" };
  const moved = moveSectionBy([first, second], "section-b", -1);
  assert.deepEqual(moved.map((item) => item.id), ["section-b", "section-a"]);
  assert.deepEqual(moved.map((item) => item.order), [1, 2]);
  assert.deepEqual(moveSectionTo([first, second], "section-b", "section-a").map((item) => item.id), ["section-b", "section-a"]);
  assert.equal(sectionWordCount(first), 4);
});

test("chapter body migrates into the first structured section", () => {
  const migrated = migrateChapterBodyToFirstSection({
    slug: "chapter",
    body: "章节开头正文",
    sections: [{ id: "section-a", title: "雨夜", order: 1, body: "小节正文", anchor: "section-1" }],
  });

  assert.equal(migrated.body, "");
  assert.deepEqual(
    migrated.sections.map((section) => [section.id, section.title, section.order, section.body, section.anchor]),
    [
      ["section-body", "正文 1", 1, "章节开头正文", "section-1"],
      ["section-a", "雨夜", 2, "小节正文", "section-2"],
    ],
  );

  const empty = migrateChapterBodyToFirstSection({ slug: "empty", body: "", sections: [] });
  assert.equal(empty.body, "");
  assert.deepEqual(empty.sections.map((section) => [section.title, section.body, section.order]), [["正文 1", "", 1]]);
});
