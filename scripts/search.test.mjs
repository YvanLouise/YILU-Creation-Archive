import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchDocuments,
  extractSearchSnippet,
  highlightSearchText,
  normalizeSearchText,
  scoreSearchDocument,
  searchDocuments,
  stripMarkdown,
} from "../src/features/search/domain.js";

const content = {
  works: [
    {
      slug: "moon", type: "小说", title: "月隐之誓", subtitle: "旧城故事",
      description: "赛莉娅在维斯塔寻找月灯。", genre: ["奇幻"], status: "连载中",
      progress: "第 1 章", order: 1, hidden: false,
    },
    {
      slug: "hidden", type: "漫画", title: "隐藏作品", subtitle: "",
      description: "", genre: [], status: "筹备中", progress: "", order: 2, hidden: true,
    },
    {
      slug: "comic", type: "漫画", title: "月灯漫画", subtitle: "",
      description: "纵向漫画", genre: ["奇幻"], status: "连载中",
      progress: "第 1 话", order: 1, hidden: false,
    },
  ],
  chapters: [
    {
      kind: "chapter", slug: "lantern", work: "moon", title: "拾到月灯的人",
      summary: "旧运河边的灯。", body: "# 正文\n\n地图上不存在的钟楼。",
      status: "published", order: 1, date: "2026-06-01",
    },
    {
      kind: "chapter", slug: "draft", work: "moon", title: "草稿章节",
      summary: "不能搜索", body: "秘密", status: "draft", order: 2, date: "2026-06-02",
    },
    {
      kind: "chapter", slug: "episode", work: "comic", title: "漫画第一话",
      summary: "月灯亮起", body: "![第一页](./uploads/page.png)",
      status: "published", order: 1, date: "2026-06-04",
    },
  ],
  characters: [
    {
      kind: "character", slug: "celia", work: "moon", title: "赛莉娅",
      summary: "月灯持有者。", body: "她在地图工坊工作。",
      role: "见习绘图师", affiliation: "维斯塔旧城地图工坊",
      profileStatus: "公开记录", aliases: ["小绘图师"], traits: ["安静", "固执"],
      status: "published", order: 1, date: "2026-05-29",
    },
  ],
  notes: [
    {
      kind: "note", slug: "rules", title: "月灯规则", summary: "设定整理",
      body: "![月灯](./uploads/light.png)\n\n月灯不是照明工具。",
      status: "published", order: 1, date: "2026-06-03",
      category: "世界观", tags: ["旧城", "规则"], relatedWork: "moon",
    },
  ],
};

content.illustrations = [
  {
    slug: "moon-art",
    title: "月光与旧誓",
    summary: "封面插画归档",
    image: "./assets/moon-oath-hero.png",
    category: "封面插画",
    series: "月隐之誓",
    status: "published",
    order: 1,
    date: "2026-06-17",
  },
  {
    slug: "draft-art",
    title: "草稿插画",
    summary: "不应搜索",
    image: "./assets/work-desk.png",
    category: "过程稿",
    series: "",
    status: "draft",
    order: 2,
    date: "2026-06-18",
  },
];

test("normalizes Chinese search text and whitespace", () => {
  assert.equal(normalizeSearchText("  月灯   RULES "), "月灯 rules");
});

test("strips Markdown syntax and image paths", () => {
  const result = stripMarkdown("# 标题\n![月灯](./uploads/light.png)\n- 正文");
  assert.equal(result.includes("./uploads"), false);
  assert.equal(result, "标题 月灯 正文");
});

test("builds public documents without drafts or hidden works", () => {
  const documents = buildSearchDocuments(content);
  assert.deepEqual(documents.map((item) => item.slug), ["moon", "comic", "lantern", "episode", "celia", "rules", "moon-art"]);
  assert.equal(documents.find((item) => item.slug === "episode").kindLabel, "漫画话数");
});

test("requires every keyword and ranks title matches first", () => {
  const documents = buildSearchDocuments(content);
  const results = searchDocuments(documents, "月灯 规则");
  assert.equal(results.length, 1);
  assert.equal(results[0].slug, "rules");
  assert.ok(scoreSearchDocument(results[0], "月灯规则") > scoreSearchDocument(results[0], "照明"));
});

test("note category tags and related work title are searchable", () => {
  const documents = buildSearchDocuments(content);
  assert.equal(searchDocuments(documents, "世界观 旧城")[0].slug, "rules");
  assert.equal(searchDocuments(documents, "月隐之誓 规则")[0].slug, "rules");
});

test("character archive metadata is searchable", () => {
  const documents = buildSearchDocuments(content);
  assert.equal(searchDocuments(documents, "地图工坊 固执")[0].slug, "celia");
  assert.equal(searchDocuments(documents, "小绘图师")[0].slug, "celia");
});

test("illustration title category and series are searchable", () => {
  const documents = buildSearchDocuments(content);
  assert.equal(searchDocuments(documents, "封面插画 月隐之誓")[0].slug, "moon-art");
  assert.equal(searchDocuments(documents, "草稿插画").length, 0);
});

test("chapter section bodies are searchable through their parent chapter only", () => {
  const documents = buildSearchDocuments({
    ...content,
    works: [{
      ...content.works[0],
      chapterStructure: {
        enableVolumes: false,
        enableSections: false,
        volumeLabel: "卷",
        chapterLabel: "章",
        sectionLabel: "小节",
      },
      volumes: [],
    }],
    chapters: [{
      ...content.chapters[0],
      body: "章节正文",
      sections: [{
        id: "section-a",
        title: "雨夜归来",
        order: 1,
        body: "钟楼密语",
        anchor: "section-1",
      }],
    }],
  });
  const results = searchDocuments(documents, "钟楼密语", "chapter");
  assert.equal(results.length, 1);
  assert.equal(results[0].kind, "chapter");
  assert.equal(results[0].slug, content.chapters[0].slug);
});

test("extracts a matching snippet and highlight segments", () => {
  const document = buildSearchDocuments(content).find((item) => item.slug === "lantern");
  assert.match(extractSearchSnippet(document, "钟楼", 30), /钟楼/);
  assert.deepEqual(
    highlightSearchText("维斯塔月灯", "月灯").filter((part) => part.match).map((part) => part.text),
    ["月灯"],
  );
});
