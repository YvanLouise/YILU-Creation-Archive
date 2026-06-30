import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUpdateDocuments,
  normalizeUpdatesType,
  resolveHomeUpdates,
  resolveUpdates,
  sortUpdateDocuments,
  updateDisplayDate,
  visibleUpdatesPage,
  migrateUpdateMetadata,
} from "../src/features/updates/domain.js";
import { stampFirstPublication } from "../src/content-system/publishing/publication.js";

function fixture(mode = "createdAt") {
  const content = {
    site: { updatesSortMode: mode },
    works: [
      {
        slug: "novel", type: "小说", title: "小说", description: "作品简介",
        cover: "./novel.png", date: "2026-05-01", createdAt: "2026-06-03T10:00:00.000Z",
        order: 1, hidden: false,
      },
      {
        slug: "comic", type: "漫画", title: "漫画", description: "",
        cover: "./comic.png", date: "2026-06-01", createdAt: "2026-06-01T10:00:00.000Z",
        order: 1, hidden: false,
      },
      {
        slug: "hidden", type: "小说", title: "隐藏作品", description: "",
        cover: "", date: "2026-06-07", createdAt: "2026-06-07T10:00:00.000Z",
        order: 2, hidden: true,
      },
    ],
    chapters: [
      {
        kind: "chapter", slug: "chapter", work: "novel", title: "小说章节",
        summary: "", cover: "", date: "2026-06-05", createdAt: "2026-06-02T10:00:00.000Z",
        status: "published", order: 2,
      },
      {
        kind: "chapter", slug: "episode", work: "comic", title: "漫画话数",
        summary: "漫画摘要", cover: "", date: "2026-06-02", createdAt: "2026-06-04T10:00:00.000Z",
        status: "published", order: 1,
      },
      {
        kind: "chapter", slug: "draft", work: "novel", title: "草稿",
        summary: "", date: "2026-06-07", status: "draft", order: 3,
      },
      {
        kind: "chapter", slug: "hidden-child", work: "hidden", title: "隐藏关联",
        summary: "", date: "2026-06-07", status: "published", order: 1,
      },
    ],
    characters: [{
      kind: "character", slug: "hero", work: "novel", title: "角色",
      summary: "角色摘要", cover: "./hero.png", date: "2026-05-20",
      createdAt: "2026-05-20T10:00:00.000Z", status: "published", order: 1,
    }],
    notes: [{
      kind: "note", slug: "note", title: "笔记", summary: "",
      cover: "", date: "2026-06-06", createdAt: "2026-05-30T10:00:00.000Z",
      status: "published", order: 1,
    }],
  };
  content.illustrations = [
    {
      slug: "illustration",
      title: "插画",
      summary: "插画摘要",
      image: "./art.png",
      date: "2026-05-10",
      createdAt: "2026-05-10T10:00:00.000Z",
      status: "published",
      order: 1,
    },
    {
      slug: "draft-illustration",
      title: "草稿插画",
      summary: "",
      image: "./draft.png",
      date: "2026-06-08",
      createdAt: "2026-06-08T10:00:00.000Z",
      status: "draft",
      order: 2,
    },
  ];
  return content;
}

test("automatic updates include every public kind and exclude drafts and hidden associations", () => {
  const documents = buildUpdateDocuments(fixture());
  assert.deepEqual(
    documents.map((item) => item.slug),
    ["novel", "comic", "chapter", "episode", "hero", "note", "illustration"],
  );
  assert.equal(documents.find((item) => item.slug === "chapter").kindLabel, "小说章节");
  assert.equal(documents.find((item) => item.slug === "episode").kindLabel, "漫画话数");
  assert.equal(documents.find((item) => item.slug === "chapter").image, "./novel.png");
  assert.equal(documents.find((item) => item.slug === "note").image, "");
});

test("update sorting follows the selected mode and uses stable tie breakers", () => {
  assert.deepEqual(resolveUpdates(fixture("createdAt")).map((item) => item.slug), [
    "episode", "novel", "chapter", "comic", "note", "hero", "illustration",
  ]);
  assert.deepEqual(resolveUpdates(fixture("date")).map((item) => item.slug), [
    "note", "chapter", "episode", "comic", "hero", "illustration", "novel",
  ]);
  const tied = [
    { title: "乙", date: "2026-06-01", createdAt: "2026-06-01T00:00:00Z", order: 1 },
    { title: "甲", date: "2026-06-01", createdAt: "2026-06-01T00:00:00Z", order: 2 },
  ];
  assert.deepEqual(sortUpdateDocuments(tied, "date").map((item) => item.title), ["乙", "甲"]);
});

test("updates archive reveals items in batches of twelve", () => {
  const updates = Array.from({ length: 25 }, (_, index) => ({ slug: `item-${index}` }));
  const first = visibleUpdatesPage(updates, 12);
  assert.equal(first.items.length, 12);
  assert.equal(first.hasMore, true);
  assert.equal(first.nextVisibleCount, 24);
  const second = visibleUpdatesPage(updates, first.nextVisibleCount);
  assert.equal(second.items.length, 24);
  assert.equal(second.hasMore, true);
  const last = visibleUpdatesPage(updates, second.nextVisibleCount);
  assert.equal(last.items.length, 25);
  assert.equal(last.hasMore, false);
});

test("home updates are limited to the latest four items", () => {
  const updates = resolveHomeUpdates(fixture());
  assert.equal(updates.length, 4);
  assert.deepEqual(updates.map((item) => item.slug), ["episode", "novel", "chapter", "comic"]);
});

test("update filters and display dates are normalized", () => {
  assert.equal(normalizeUpdatesType("bad"), "all");
  assert.deepEqual(resolveUpdates(fixture(), "comicEpisode").map((item) => item.slug), ["episode"]);
  assert.deepEqual(resolveUpdates(fixture(), "illustration").map((item) => item.slug), ["illustration"]);
  const update = resolveUpdates(fixture(), "comicEpisode")[0];
  assert.equal(updateDisplayDate(update, "createdAt"), "2026-06-04");
  assert.equal(updateDisplayDate(update, "date"), "2026-06-02");
});

test("first publication timestamps are added once to public content", () => {
  const content = fixture();
  content.works[0].createdAt = "";
  content.chapters[0].createdAt = "";
  content.chapters[2].createdAt = "";
  const first = stampFirstPublication(content, "2026-06-07T12:00:00.000Z");
  assert.equal(first.works[0].createdAt, "2026-06-07T12:00:00.000Z");
  assert.equal(first.chapters[0].createdAt, "2026-06-07T12:00:00.000Z");
  assert.equal(first.chapters[2].createdAt, "");
  const second = stampFirstPublication(first, "2026-06-08T12:00:00.000Z");
  assert.equal(second.works[0].createdAt, "2026-06-07T12:00:00.000Z");
  assert.equal(second.chapters[0].createdAt, "2026-06-07T12:00:00.000Z");
});

test("legacy update metadata migrates without losing content", () => {
  const content = fixture();
  content.site = { updates: [{ kind: "note", slug: "note" }] };
  delete content.works[0].date;
  delete content.works[0].createdAt;
  delete content.chapters[0].createdAt;
  const migrated = migrateUpdateMetadata(content, "2026-06-07");
  assert.equal(migrated.site.updatesSortMode, "createdAt");
  assert.equal(Object.hasOwn(migrated.site, "updates"), false);
  assert.equal(migrated.works[0].date, "2026-06-05");
  assert.equal(migrated.works[0].createdAt, "2026-06-05T00:00:00.000Z");
  assert.equal(migrated.chapters[0].createdAt, "2026-06-05T00:00:00.000Z");
});

test("current drafts keep empty first-publication timestamps until sync", () => {
  const content = fixture();
  content.works[0].createdAt = "";
  content.chapters[0].createdAt = "";
  const migrated = migrateUpdateMetadata(content, "2026-06-07");
  assert.equal(migrated.works[0].createdAt, "");
  assert.equal(migrated.chapters[0].createdAt, "");
});
