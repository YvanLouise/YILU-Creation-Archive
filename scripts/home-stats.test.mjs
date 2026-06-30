import test from "node:test";
import assert from "node:assert/strict";
import { resolveHomeStats } from "../src/features/home/stats.js";

test("home stats are derived from public content instead of site config", () => {
  const content = {
    site: {
      stats: [{ label: "静态", value: "999" }],
    },
    works: [
      { slug: "public-work", title: "公开", hidden: false },
      { slug: "hidden-work", title: "隐藏", hidden: true },
    ],
    chapters: [
      { slug: "chapter", work: "public-work", status: "published" },
      { slug: "draft", work: "public-work", status: "draft" },
      { slug: "hidden-work-chapter", work: "hidden-work", status: "published" },
    ],
    characters: [
      { slug: "hero", work: "public-work", status: "published" },
      { slug: "hidden-hero", work: "hidden-work", status: "published" },
    ],
    notes: [
      { slug: "note", status: "published" },
      { slug: "draft-note", status: "draft" },
    ],
  };

  assert.deepEqual(resolveHomeStats(content), [
    { label: "正在创作", value: "1 部" },
    { label: "已发布章节", value: "1 篇" },
    { label: "角色设定", value: "1 位" },
    { label: "创作笔记", value: "1 篇" },
  ]);
});
