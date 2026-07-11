import test from "node:test";
import assert from "node:assert/strict";
import {
  assertSafeRepositoryPath,
  illustrationSchema,
  markdownMetaSchema,
  publishRequestSchema,
  siteConfigSchema,
  validateContent,
  workSchema,
} from "../src/content-system/model/schema.js";
import {
  normalizeAssetPath,
  normalizeMarkdownImagePaths,
} from "../src/content-system/model/assetPaths.js";
import { parseMarkdownFile, stringifyMarkdownFile } from "../src/content-system/markdown/frontmatter.js";
import { normalizeContent } from "../src/content-system/model/normalize.js";
import { groupChaptersByVolume } from "../src/content-system/model/novelStructure.js";
import { serializeContent } from "../src/content-system/publishing/serialize.js";

test("frontmatter round trip", () => {
  const source = stringifyMarkdownFile({
    title: "测试", slug: "test-item", summary: "摘要", date: "2026-06-06",
    status: "draft", order: 1,
  }, "# 正文");
  const parsed = parseMarkdownFile(source);
  assert.equal(parsed.meta.slug, "test-item");
  assert.equal(parsed.body, "# 正文");
});

test("frontmatter preserves image presentation objects", () => {
  const presentation = { focusX: 42, focusY: 63, zoom: 1.35 };
  const source = stringifyMarkdownFile({
    title: "裁切测试", slug: "crop-test", summary: "", date: "2026-07-11",
    status: "draft", order: 1, coverPresentation: presentation,
  }, "# 正文");
  assert.deepEqual(parseMarkdownFile(source).meta.coverPresentation, presentation);
});

test("note frontmatter library fields round trip", () => {
  const source = stringifyMarkdownFile({
    title: "笔记",
    slug: "note-item",
    summary: "",
    date: "2026-06-06",
    status: "published",
    order: 2,
    relatedWork: "moon",
    category: "世界观",
    tags: ["月灯", "旧城"],
    pinned: true,
    cover: "./assets/work-desk.png",
  }, "# 正文");
  const parsed = parseMarkdownFile(source);
  assert.deepEqual(parsed.meta.tags, ["月灯", "旧城"]);
  assert.equal(parsed.meta.pinned, true);
  assert.equal(parsed.meta.category, "世界观");
  assert.equal(parsed.meta.relatedWork, "moon");
});

test("character archive fields round trip and normalize defaults", () => {
  const source = stringifyMarkdownFile({
    title: "角色",
    slug: "character",
    summary: "摘要",
    date: "2026-06-06",
    status: "published",
    order: 1,
    work: "work",
    role: "绘图师",
    affiliation: "地图工坊",
    profileStatus: "公开记录",
    aliases: ["小绘图师"],
    traits: ["安静", "固执"],
    abilities: [{ name: "月灯感知", description: "辨认记忆痕迹", image: "./assets/moon.png" }],
    timeline: [{ label: "17岁 · 冬", description: "进入地图工坊" }],
    relationships: [{ characterSlug: "traveler", label: "同行者", description: "共同旅行" }],
    gallery: [{ label: "基础肖像", image: "./assets/portrait.png" }],
  }, "# 正文");
  const parsed = parseMarkdownFile(source);
  assert.equal(parsed.meta.role, "绘图师");
  assert.deepEqual(parsed.meta.aliases, ["小绘图师"]);
  assert.deepEqual(parsed.meta.traits, ["安静", "固执"]);
  assert.equal(parsed.meta.abilities[0].name, "月灯感知");
  assert.equal(parsed.meta.timeline[0].label, "17岁 · 冬");
  assert.equal(parsed.meta.relationships[0].characterSlug, "traveler");
  assert.equal(parsed.meta.gallery[0].image, "./assets/portrait.png");

  const content = normalizeContent({
    site: {
      brand: { name: "档案馆", subtitle: "故事", email: "test@example.com" },
      author: { name: "伊露", intro: "介绍" },
      featuredWorkSlug: "work",
      updatesSortMode: "createdAt",
      stats: [],
    },
    works: [{
      slug: "work", type: "小说", title: "作品", subtitle: "", description: "简介",
      cover: "./assets/cover.png", genre: ["奇幻"], status: "连载中",
      progress: "第 1 章", date: "2026-06-01", order: 1, hidden: false,
    }],
    chapters: [],
    characters: [{
      kind: "character", title: "角色", slug: "character", summary: "",
      date: "2026-06-06", status: "published", order: 1, work: "work", body: "",
    }],
    notes: [],
  });
  assert.deepEqual(content.characters[0].traits, []);
  assert.deepEqual(content.characters[0].abilities, []);
  assert.deepEqual(content.characters[0].timeline, []);
  assert.deepEqual(content.characters[0].relationships, []);
  assert.deepEqual(content.characters[0].gallery, []);
  assert.equal(content.characters[0].role, "");
});

test("markdown schema validates character archive field types", () => {
  const result = markdownMetaSchema.safeParse({
    title: "角色", slug: "character", summary: "", date: "2026-06-06",
    status: "published", order: 1, role: [], traits: ["", "安静"],
    abilities: [{ name: 42 }],
  });
  assert.equal(result.success, false);
});

test("markdown schema rejects invalid slug", () => {
  const result = markdownMetaSchema.safeParse({
    title: "测试", slug: "../bad", summary: "摘要", date: "2026-06-06",
    status: "draft", order: 1,
  });
  assert.equal(result.success, false);
});

test("repository path allowlist blocks traversal", () => {
  assert.throws(() => assertSafeRepositoryPath("src/content/../../secret"));
  assert.equal(assertSafeRepositoryPath("README.md"), "README.md");
  assert.equal(assertSafeRepositoryPath("src/content/notes/test.md"), "src/content/notes/test.md");
  assert.equal(assertSafeRepositoryPath("src/content/illustrations/moonlight.json"), "src/content/illustrations/moonlight.json");
  assert.throws(() => assertSafeRepositoryPath("package.json"));
});

test("publish schema validates file actions", () => {
  assert.equal(publishRequestSchema.safeParse({
    baseSha: "abc", message: "test",
    files: [{ path: "src/content/site.json", action: "upsert", content: "{}" }],
  }).success, true);
});

test("site config validates editable social links", () => {
  const site = {
    brand: { name: "档案馆", subtitle: "故事", email: "test@example.com" },
    author: { name: "伊露", intro: "介绍" },
    featuredWorkSlug: "work",
    showWorkbench: true,
    updatesSortMode: "createdAt",
    stats: [],
    socialLinks: [
      { id: "bilibili", label: "哔哩哔哩", url: "https://space.bilibili.com/1", enabled: true },
      { id: "afdian", label: "爱发电", url: "https://afdian.com/a/test", enabled: false },
    ],
  };
  assert.equal(siteConfigSchema.safeParse(site).success, true);
  assert.equal(siteConfigSchema.safeParse({
    ...site,
    brand: { ...site.brand, url: "https://example.com/archive/" },
  }).success, true);
  assert.equal(siteConfigSchema.safeParse({
    ...site,
    brand: { ...site.brand, url: "javascript:alert(1)" },
  }).success, false);
  assert.equal(siteConfigSchema.safeParse({ ...site, showWorkbench: "yes" }).success, false);
  assert.equal(siteConfigSchema.safeParse({
    ...site,
    socialLinks: [{ id: "bad", label: "错误链接", url: "javascript:alert(1)", enabled: true }],
  }).success, false);
});

test("site config defaults the homepage workbench to visible", () => {
  const content = normalizeContent({
    site: {
      brand: { name: "档案馆", subtitle: "故事", email: "test@example.com" },
      author: { name: "伊露", intro: "介绍" },
      featuredWorkSlug: "work",
      updatesSortMode: "createdAt",
      stats: [],
    },
    works: [{
      slug: "work", type: "小说", title: "作品", subtitle: "", description: "简介",
      cover: "./assets/cover.png", genre: ["奇幻"], status: "连载中",
      progress: "第 1 章", date: "2026-06-01", createdAt: "",
      order: 1, hidden: false,
    }],
    chapters: [],
    characters: [],
    notes: [],
  });
  assert.equal(content.site.showWorkbench, true);
  assert.deepEqual(content.site.workCategories.novel.map((item) => item.label), ["长篇", "中篇", "短篇"]);
  assert.deepEqual(content.site.workCategories.comic.map((item) => item.label), ["长篇", "中篇", "短篇"]);
  assert.equal(content.works[0].workCategory, "");
});

test("work category config validates stable ids and non-empty unique labels", () => {
  const site = {
    brand: { name: "档案馆", subtitle: "故事", email: "test@example.com" },
    author: { name: "伊露", intro: "介绍" },
    featuredWorkSlug: "work",
    updatesSortMode: "createdAt",
    stats: [],
    workCategories: {
      novel: [
        { id: "long", label: "长篇" },
        { id: "short", label: "短篇" },
      ],
      comic: [],
    },
  };
  assert.equal(siteConfigSchema.safeParse(site).success, true);
  assert.equal(siteConfigSchema.safeParse({
    ...site,
    workCategories: {
      ...site.workCategories,
      novel: [
        { id: "duplicate", label: "长篇" },
        { id: "duplicate", label: "长篇" },
      ],
    },
  }).success, false);
  assert.equal(workSchema.safeParse({
    slug: "work",
    type: "小说",
    title: "作品",
    subtitle: "",
    description: "简介",
    cover: "./assets/cover.png",
    genre: ["奇幻"],
    workCategory: 1,
    status: "连载中",
    progress: "第 1 章",
    date: "2026-06-01",
    order: 1,
    hidden: false,
  }).success, false);
});

test("asset paths normalize uploaded and manually entered image references", () => {
  assert.equal(normalizeAssetPath("assets\\avatar.png\""), "./assets/avatar.png");
  assert.equal(normalizeAssetPath("public/uploads/2026/06/page.png"), "./uploads/2026/06/page.png");
  assert.equal(
    normalizeMarkdownImagePaths("![p](public\\uploads\\2026\\06\\page.png)"),
    "![p](./uploads/2026/06/page.png)",
  );

  const content = normalizeContent({
    site: {
      brand: { name: "档案馆", subtitle: "故事", email: "test@example.com" },
      author: { name: "伊露", intro: "介绍", avatar: "assets\\avatar.png\"" },
      featuredWorkSlug: "comic",
      updatesSortMode: "createdAt",
      stats: [],
    },
    works: [{
      slug: "comic", type: "漫画", title: "漫画", subtitle: "", description: "简介",
      cover: "public\\uploads\\2026\\06\\cover.png", genre: ["日常"], status: "连载中",
      progress: "第 1 话", date: "2026-06-01", order: 1, hidden: false,
    }],
    chapters: [{
      kind: "chapter", title: "第一话", slug: "episode", summary: "",
      date: "2026-06-02", status: "published", order: 1, work: "comic",
      cover: "uploads\\2026\\06\\cover.png",
      body: "![第1页](public\\uploads\\2026\\06\\page.png)",
    }],
    characters: [],
    notes: [],
  });

  assert.equal(content.site.author.avatar, "./assets/avatar.png");
  assert.equal(content.works[0].cover, "./uploads/2026/06/cover.png");
  assert.equal(content.chapters[0].cover, "./uploads/2026/06/cover.png");
  assert.equal(content.chapters[0].body, "![第1页](./uploads/2026/06/page.png)");
});

test("work schema validates the complete public metadata shape", () => {
  assert.equal(workSchema.safeParse({
    slug: "test-work",
    type: "小说",
    title: "测试作品",
    subtitle: "",
    description: "作品简介",
    cover: "./assets/cover.png",
    genre: ["奇幻"],
    status: "连载中",
    progress: "第 1 章",
    date: "2026-06-01",
    createdAt: "2026-06-01T00:00:00.000Z",
    order: 1,
    hidden: false,
  }).success, true);
  assert.equal(workSchema.safeParse({
    slug: "bad",
    type: "诗歌",
    title: "",
    subtitle: "",
    description: "",
    cover: "",
    genre: [],
    status: "",
    progress: "",
    order: 1,
    hidden: "false",
  }).success, false);
});

test("illustration schema validates public gallery metadata", () => {
  const item = {
    slug: "moonlight-art",
    title: "月光与旧誓",
    summary: "封面插画归档说明",
    image: "./assets/moon-oath-hero.png",
    category: "封面插画",
    series: "月隐之誓",
    date: "2026-06-17",
    order: 1,
    status: "published",
    featured: true,
  };
  assert.equal(illustrationSchema.safeParse(item).success, true);
  assert.equal(illustrationSchema.safeParse({ ...item, category: "自定义分类" }).success, true);
  assert.equal(illustrationSchema.safeParse({ ...item, title: "", category: "" }).success, false);
});

test("comic work fields and comic page alt text are validated", () => {
  const comic = {
    slug: "comic",
    type: "漫画",
    title: "测试漫画",
    subtitle: "",
    description: "漫画简介",
    cover: "./assets/cover.png",
    genre: ["奇幻"],
    status: "连载中",
    progress: "第 1 话",
    date: "2026-06-01",
    createdAt: "2026-06-01T00:00:00.000Z",
    updateFrequency: "每月更新",
    readingMode: "vertical",
    order: 1,
    hidden: false,
  };
  assert.equal(workSchema.safeParse(comic).success, true);
  assert.equal(workSchema.safeParse({ ...comic, readingMode: "rtl" }).success, false);
  const issues = validateContent({
    site: { featuredWorkSlug: "comic" },
    works: [comic],
    chapters: [{
      kind: "chapter", slug: "episode", work: "comic", title: "第一话",
      summary: "摘要", date: "2026-06-07", status: "published", order: 1,
      body: "![](./uploads/page.png)",
    }],
    characters: [],
  });
  assert.ok(issues.some((issue) => issue.includes("替代文本")));
});

test("content validation rejects duplicate slugs and hidden featured work", () => {
  const work = {
    slug: "work",
    type: "小说",
    title: "作品",
    subtitle: "",
    description: "简介",
    cover: "./assets/cover.png",
    genre: ["奇幻"],
    status: "连载中",
    progress: "第 1 章",
    date: "2026-06-01",
    createdAt: "2026-06-01T00:00:00.000Z",
    order: 1,
    hidden: true,
  };
  const issues = validateContent({
    site: { featuredWorkSlug: "work" },
    works: [work, { ...work }],
    chapters: [],
    characters: [],
  });
  assert.ok(issues.some((issue) => issue.includes("重复作品 slug")));
  assert.ok(issues.some((issue) => issue.includes("主推作品必须处于公开状态")));
});

test("content validation allows an empty markdown summary", () => {
  const work = {
    slug: "work",
    type: "\u5c0f\u8bf4",
    title: "Work",
    subtitle: "",
    description: "Description",
    cover: "./assets/cover.png",
    genre: ["Fantasy"],
    status: "Serializing",
    progress: "Chapter 1",
    date: "2026-06-01",
    createdAt: "2026-06-01T00:00:00.000Z",
    order: 1,
    hidden: false,
  };
  const issues = validateContent({
    site: { featuredWorkSlug: "work" },
    works: [work],
    chapters: [{
      kind: "chapter",
      slug: "chapter-one",
      work: "work",
      title: "Chapter 1",
      summary: "",
      date: "2026-06-07",
      status: "published",
      order: 1,
      body: "Body",
    }],
    characters: [],
    notes: [],
  });
  assert.equal(issues.some((issue) => issue.includes("chapters.chapter-one") && issue.includes("summary")), false);
});

test("content validation rejects invalid note related works", () => {
  const visibleWork = {
    slug: "visible", type: "小说", title: "公开", subtitle: "", description: "简介",
    cover: "./assets/cover.png", genre: ["奇幻"], status: "连载中",
    progress: "第 1 章", date: "2026-06-01", createdAt: "2026-06-01T00:00:00.000Z",
    order: 1, hidden: false,
  };
  const hiddenWork = { ...visibleWork, slug: "hidden", title: "隐藏", order: 2, hidden: true };
  const issues = validateContent({
    site: { featuredWorkSlug: "visible" },
    works: [visibleWork, hiddenWork],
    chapters: [],
    characters: [],
    notes: [
      {
        kind: "note", title: "隐藏关联", slug: "hidden-note", summary: "",
        date: "2026-06-07", status: "published", order: 1, body: "",
        relatedWork: "hidden",
      },
      {
        kind: "note", title: "丢失关联", slug: "missing-note", summary: "",
        date: "2026-06-08", status: "published", order: 2, body: "",
        relatedWork: "missing",
      },
    ],
  });
  assert.equal(issues.some((issue) => issue.includes("尚未公开")), true);
  assert.equal(issues.some((issue) => issue.includes("不存在的关联作品")), true);
});

test("content validation reports duplicate work order sources", () => {
  const issues = validateContent({
    site: { featuredWorkSlug: "comic-a", updatesSortMode: "date" },
    works: [
      {
        slug: "comic-a", type: "漫画", title: "漫画甲", subtitle: "",
        description: "简介", cover: "./assets/cover.png", genre: ["日常"],
        status: "连载中", progress: "第 1 话", date: "2026-06-01",
        createdAt: "2026-06-01T00:00:00.000Z", order: 1, hidden: false,
        updateFrequency: "每月", readingMode: "vertical",
      },
      {
        slug: "comic-b", type: "漫画", title: "漫画乙", subtitle: "",
        description: "简介", cover: "./assets/cover.png", genre: ["日常"],
        status: "连载中", progress: "第 1 话", date: "2026-06-02",
        createdAt: "2026-06-02T00:00:00.000Z", order: 1, hidden: false,
        updateFrequency: "每月", readingMode: "vertical",
      },
    ],
    chapters: [
      {
        kind: "chapter", title: "第一话", slug: "episode-a", summary: "",
        date: "2026-06-03", status: "published", order: 1, work: "comic-a",
        body: "![第一页](./uploads/a.png)",
      },
      {
        kind: "chapter", title: "第一话", slug: "episode-b", summary: "",
        date: "2026-06-03", status: "published", order: 1, work: "comic-b",
        body: "![第一页](./uploads/b.png)",
      },
    ],
    characters: [],
    notes: [],
  });

  const issue = issues.find((item) => item.includes("漫画作品排序重复"));
  assert.match(issue, /排序 1/);
  assert.match(issue, /漫画甲/);
  assert.match(issue, /comic-a/);
  assert.match(issue, /漫画乙/);
  assert.match(issue, /comic-b/);
});

test("content validation rejects missing and self-referencing character relationships", () => {
  const work = {
    slug: "work", type: "小说", title: "作品", subtitle: "", description: "简介",
    cover: "./assets/cover.png", genre: ["奇幻"], status: "连载中",
    progress: "第 1 章", date: "2026-06-01", createdAt: "2026-06-01T00:00:00.000Z",
    order: 1, hidden: false,
  };
  const issues = validateContent({
    site: { featuredWorkSlug: "work" },
    works: [work],
    chapters: [],
    characters: [{
      kind: "character", title: "角色", slug: "character", summary: "",
      date: "2026-06-06", status: "published", order: 1, work: "work", body: "",
      relationships: [
        { characterSlug: "character", label: "自己", description: "" },
        { characterSlug: "missing", label: "未知", description: "" },
      ],
    }],
    notes: [],
  });
  assert.equal(issues.some((issue) => issue.includes("不能指向自身")), true);
  assert.equal(issues.some((issue) => issue.includes("不存在的关联角色")), true);
});

test("content validation allows characters without an assigned work", () => {
  const work = {
    slug: "visible-work",
    type: "小说",
    title: "Visible Work",
    subtitle: "",
    description: "Description",
    cover: "./assets/work-desk.png",
    genre: ["fantasy"],
    status: "连载中",
    progress: "第 1 章",
    date: "2026-06-01",
    createdAt: "2026-06-01T00:00:00.000Z",
    order: 1,
    hidden: false,
  };
  const base = {
    kind: "character",
    slug: "no-work-character",
    work: "",
    title: "No Work Character",
    summary: "Summary",
    cover: "./assets/work-desk.png",
    date: "2026-06-02",
    createdAt: "2026-06-02T00:00:00.000Z",
    status: "published",
    order: 1,
    body: "Body",
  };
  const content = {
    site: { featuredWorkSlug: work.slug },
    works: [work],
    chapters: [],
    characters: [base],
    notes: [],
    illustrations: [],
  };

  assert.deepEqual(validateContent(content), []);
  assert.ok(validateContent({
    ...content,
    chapters: [{ ...base, kind: "chapter", slug: "chapter-no-work" }],
    characters: [],
  }).some((issue) => issue.includes("No Work Character") || issue.includes("chapter-no-work")));
});

test("draft markdown is never serialized for public publishing", () => {
  const content = {
    site: {
      featuredWorkSlug: "work",
      updatesSortMode: "createdAt",
    },
    works: [{
      slug: "work", type: "小说", title: "作品", subtitle: "", description: "简介",
      cover: "./assets/cover.png", genre: ["奇幻"], status: "连载中",
      progress: "第 1 章", date: "2026-06-01", createdAt: "2026-06-01T00:00:00.000Z",
      order: 1, hidden: false,
    }],
    chapters: [],
    characters: [],
    notes: [{
      kind: "note", title: "草稿", slug: "draft-note", summary: "草稿",
      date: "2026-06-06", status: "draft", order: 1, body: "# 草稿",
    }],
    illustrations: [
      {
        slug: "published-art",
        title: "公开插画",
        summary: "公开插画摘要",
        image: "public\\uploads\\2026\\06\\art.png",
        category: "场景",
        series: "测试系列",
        date: "2026-06-07",
        order: 1,
        status: "published",
        featured: false,
      },
      {
        slug: "draft-art",
        title: "草稿插画",
        summary: "草稿",
        image: "./assets/work-desk.png",
        category: "过程稿",
        series: "",
        date: "2026-06-08",
        order: 2,
        status: "draft",
        featured: false,
      },
    ],
  };
  const paths = serializeContent(content).map((file) => file.path);
  assert.equal(paths.includes("src/content/notes/draft-note.md"), false);
  assert.equal(paths.includes("src/content/illustrations/published-art.json"), true);
  assert.equal(paths.includes("src/content/illustrations/draft-art.json"), false);
  const illustrationFile = serializeContent(content).find((file) => file.path === "src/content/illustrations/published-art.json");
  assert.equal(JSON.parse(illustrationFile.content).image, "./uploads/2026/06/art.png");
  const publishedSite = JSON.parse(serializeContent(content)[0].content);
  assert.equal(Object.hasOwn(publishedSite, "updates"), false);
});

test("chapter sections round trip through frontmatter", () => {
  const sections = [{
    id: "section-a",
    title: "雨夜归来",
    order: 1,
    body: "小节正文",
    anchor: "section-1",
  }];
  const parsed = parseMarkdownFile(stringifyMarkdownFile({
    title: "测试章节",
    slug: "chapter-with-sections",
    summary: "",
    date: "2026-06-06",
    status: "draft",
    order: 1,
    work: "work",
    volume: "volume-a",
    sections,
  }, "章节正文"));
  assert.deepEqual(parsed.meta.sections, sections);
  assert.equal(parsed.meta.volume, "volume-a");
});

test("novel chapter structure defaults during normalization", () => {
  const content = normalizeContent({
    site: {
      brand: { name: "站点", subtitle: "副标题", email: "test@example.com" },
      author: { name: "作者", intro: "介绍" },
      featuredWorkSlug: "work",
      updatesSortMode: "createdAt",
      stats: [],
    },
    works: [{
      slug: "work", type: "小说", title: "作品", subtitle: "", description: "简介",
      cover: "./assets/work-desk.png", genre: ["奇幻"], status: "连载中",
      progress: "第 1 章", date: "2026-06-01", order: 1, hidden: false,
    }],
    chapters: [{
      kind: "chapter", title: "第一章", slug: "chapter-one", summary: "",
      date: "2026-06-02", status: "published", order: 1, work: "work",
      body: "正文",
    }],
    characters: [],
    notes: [],
    illustrations: [],
  });
  assert.deepEqual(content.works[0].chapterStructure, {
    enableVolumes: false,
    enableSections: false,
    volumeLabel: "卷",
    chapterLabel: "章",
    sectionLabel: "小节",
  });
  assert.deepEqual(content.works[0].volumes, []);
  assert.equal(content.chapters[0].volume, "");
  assert.deepEqual(content.chapters[0].sections, []);
});

test("hidden volumes stay available for admin grouping", () => {
  const work = {
    chapterStructure: { enableVolumes: true },
    volumes: [
      { id: "volume-visible", title: "第一卷", order: 1, status: "visible" },
      { id: "volume-hidden", title: "第二卷", order: 2, status: "hidden" },
    ],
  };
  const chapters = [
    { slug: "chapter-a", title: "A", order: 1, volume: "volume-visible" },
    { slug: "chapter-b", title: "B", order: 2, volume: "volume-hidden" },
  ];

  assert.deepEqual(
    groupChaptersByVolume(work, chapters).map((group) => group.id),
    ["volume-visible", "__unassigned__"],
  );
  assert.deepEqual(
    groupChaptersByVolume(work, chapters, { includeHiddenVolumes: true }).map((group) => group.id),
    ["volume-visible", "volume-hidden"],
  );
});
