import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";
import { parseHashLocation } from "../src/app/hashRoute.js";
import { matchPublicRoute } from "../src/site/router/matchPublicRoute.js";
import {
  illustrationCategoriesFor,
  parseIllustrationQuery,
  resolveIllustrationsView,
} from "../src/features/illustrations/domain.js";
import {
  createContent,
  createMarkdownItem,
  createWork,
} from "./helpers/content-fixture.mjs";

test("parses search route query parameters", () => {
  assert.deepEqual(
    parseHashLocation("#/search?q=%E6%9C%88%E7%81%AF&type=note"),
    {
      route: "/search",
      query: "q=%E6%9C%88%E7%81%AF&type=note",
      anchor: "",
    },
  );
});

test("keeps in-page work anchors separate from the route", () => {
  assert.deepEqual(
    parseHashLocation("#/works/moon-oath#settings"),
    {
      route: "/works/moon-oath",
      query: "",
      anchor: "settings",
    },
  );
});

test("public work categories filter within the active work type", async () => {
  const base = createContent();
  const content = createContent({
    site: {
      ...base.site,
      workCategories: {
        novel: [
          { id: "long", label: "长篇" },
          { id: "short", label: "短篇" },
        ],
        comic: [{ id: "long", label: "长篇" }],
      },
    },
    works: [
      createWork({ slug: "long-novel", title: "长篇小说", workCategory: "long", order: 1 }),
      createWork({ slug: "short-novel", title: "短篇小说", workCategory: "short", order: 2 }),
      createWork({ slug: "plain-novel", title: "未分类小说", workCategory: "", order: 3 }),
      createWork({ slug: "comic", type: "漫画", title: "漫画作品", workCategory: "long", order: 1 }),
    ],
    chapters: [],
  });
  const server = await createServer({
    configFile: "vite.config.js",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  try {
    const { PublicRouter } = await server.ssrLoadModule("/src/site/router/PublicRouter.jsx");
    const html = renderToString(React.createElement(PublicRouter, {
      content,
      route: "/works",
      query: "type=novel&category=short",
      navigationType: "load",
    }));
    assert.match(html, /全部/);
    assert.match(html, /长篇/);
    assert.match(html, /短篇小说/);
    assert.doesNotMatch(html, /长篇小说/);
    assert.doesNotMatch(html, /未分类小说/);
    assert.doesNotMatch(html, /漫画作品/);
  } finally {
    await server.close();
  }
});

test("parses updates filters from the hash route", () => {
  assert.deepEqual(
    parseHashLocation("#/updates?type=comicEpisode"),
    {
      route: "/updates",
      query: "type=comicEpisode",
      anchor: "",
    },
  );
});

test("parses illustration filters from the hash route", () => {
  assert.deepEqual(
    parseHashLocation("#/illustrations?category=%E5%9C%BA%E6%99%AF&sort=order"),
    {
      route: "/illustrations",
      query: "category=%E5%9C%BA%E6%99%AF&sort=order",
      anchor: "",
    },
  );
});

test("illustration filters are derived from current public content", () => {
  const content = createContent({
    illustrations: [
      {
        slug: "first-art",
        title: "第一张",
        summary: "摘要",
        image: "./assets/moon-oath-hero.png",
        category: "自定义分类",
        series: "",
        date: "2026-06-17",
        order: 1,
        status: "published",
        featured: false,
      },
      {
        slug: "draft-art",
        title: "草稿",
        summary: "摘要",
        image: "./assets/work-desk.png",
        category: "草稿分类",
        series: "",
        date: "2026-06-18",
        order: 2,
        status: "draft",
        featured: false,
      },
    ],
  });
  assert.deepEqual(illustrationCategoriesFor(content.illustrations.filter((item) => item.status === "published")), ["自定义分类"]);
  assert.equal(parseIllustrationQuery("category=草稿分类", ["自定义分类"]).category, "all");
  assert.deepEqual(resolveIllustrationsView(content, "category=自定义分类").items.map((item) => item.slug), ["first-art"]);
});

test("illustration view exposes ordered featured carousel items", () => {
  const content = createContent({
    illustrations: [
      {
        slug: "featured-two",
        title: "Featured Two",
        summary: "Summary",
        image: "./assets/work-desk.png",
        category: "scene",
        series: "",
        date: "2026-06-16",
        order: 2,
        status: "published",
        featured: true,
      },
      {
        slug: "featured-one",
        title: "Featured One",
        summary: "Summary",
        image: "./assets/moon-oath-hero.png",
        category: "scene",
        series: "",
        date: "2026-06-17",
        order: 1,
        status: "published",
        featured: true,
      },
      {
        slug: "plain",
        title: "Plain",
        summary: "Summary",
        image: "./assets/about-avatar.png",
        category: "scene",
        series: "",
        date: "2026-06-18",
        order: 3,
        status: "published",
        featured: false,
      },
    ],
  });

  assert.deepEqual(resolveIllustrationsView(content, "").featuredItems.map((item) => item.slug), [
    "featured-one",
    "featured-two",
  ]);
});

test("illustration view falls back to the latest public image when none are featured", () => {
  const content = createContent({
    illustrations: [
      {
        slug: "older",
        title: "Older",
        summary: "Summary",
        image: "./assets/work-desk.png",
        category: "scene",
        series: "",
        date: "2026-06-16",
        order: 1,
        status: "published",
        featured: false,
      },
      {
        slug: "latest",
        title: "Latest",
        summary: "Summary",
        image: "./assets/moon-oath-hero.png",
        category: "scene",
        series: "",
        date: "2026-06-18",
        order: 2,
        status: "published",
        featured: false,
      },
    ],
  });

  assert.deepEqual(resolveIllustrationsView(content, "").featuredItems.map((item) => item.slug), ["latest"]);
});

test("defaults an empty hash to the home route", () => {
  assert.deepEqual(parseHashLocation(""), { route: "/", query: "", anchor: "" });
});

test("matches public detail routes without React", () => {
  assert.deepEqual(matchPublicRoute("/works/moon-oath"), {
    name: "work",
    params: { workSlug: "moon-oath" },
  });
  assert.deepEqual(
    matchPublicRoute("/works/moon-oath/chapters/lantern"),
    {
      name: "chapter",
      params: { workSlug: "moon-oath", itemSlug: "lantern" },
    },
  );
  assert.deepEqual(matchPublicRoute("/illustrations"), {
    name: "illustrations",
    params: {},
  });
  assert.equal(matchPublicRoute("/missing").name, "notFound");
});

test("renders illustration collection route", async () => {
  const content = createContent({
    illustrations: [{
      slug: "moonlight-art",
      title: "月光与旧誓",
      summary: "封面插画归档",
      image: "./assets/moon-oath-hero.png",
      category: "封面插画",
      series: "月隐之誓",
      date: "2026-06-17",
      order: 1,
      status: "published",
      featured: true,
    }],
  });

  const server = await createServer({
    configFile: "vite.config.js",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  try {
    const { PublicRouter } = await server.ssrLoadModule("/src/site/router/PublicRouter.jsx");
    const originalError = console.error;
    console.error = (...args) => {
      if (String(args[0] || "").includes("useLayoutEffect does nothing on the server")) return;
      originalError(...args);
    };
    let html;
    try {
      html = renderToString(React.createElement(PublicRouter, {
        content,
        route: "/illustrations",
        navigationType: "load",
      }));
    } finally {
      console.error = originalError;
    }
    assert.match(html, /插画收藏/);
    assert.match(html, /月光与旧誓/);
  } finally {
    await server.close();
  }
});

test("renders comic chapter route with reader navigation", async () => {
  const work = createWork({
    slug: "comic",
    type: "漫画",
    title: "测试漫画",
    progress: "第 2 话",
    updateFrequency: "每周更新",
    readingMode: "vertical",
  });
  const content = createContent({
    site: {
      ...createContent().site,
      featuredWorkSlug: "comic",
    },
    works: [work],
    chapters: [
      createMarkdownItem({
        slug: "episode-one",
        work: "comic",
        title: "第一话",
        order: 1,
        body: "![第一页](./uploads/first.png)",
      }),
      createMarkdownItem({
        slug: "episode-two",
        work: "comic",
        title: "第二话",
        order: 2,
        body: "![第二页](./uploads/second.png)",
      }),
    ],
  });

  const server = await createServer({
    configFile: "vite.config.js",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  try {
    const { PublicRouter } = await server.ssrLoadModule("/src/site/router/PublicRouter.jsx");
    const originalError = console.error;
    console.error = (...args) => {
      if (String(args[0] || "").includes("useLayoutEffect does nothing on the server")) return;
      originalError(...args);
    };
    let html;
    try {
      html = renderToString(React.createElement(PublicRouter, {
        content,
        route: "/works/comic/chapters/episode-two",
        navigationType: "load",
      }));
    } finally {
      console.error = originalError;
    }

    assert.match(html, /Comic episode/);
    assert.match(html, /上一话/);
    assert.match(html, /目录/);
  } finally {
    await server.close();
  }
});

test("renders novel volumes and section anchors only when enabled", async () => {
  const work = createWork({
    slug: "novel",
    title: "长篇测试",
    chapterStructure: {
      enableVolumes: true,
      enableSections: true,
      volumeLabel: "卷",
      chapterLabel: "章",
      sectionLabel: "小节",
    },
    volumes: [{
      id: "volume-a",
      title: "第一卷 月影之章",
      subtitle: "",
      summary: "卷简介文字",
      order: 1,
      status: "visible",
      collapsed: false,
    }],
  });
  const content = createContent({
    site: {
      ...createContent().site,
      featuredWorkSlug: "novel",
    },
    works: [work],
    chapters: [createMarkdownItem({
      slug: "chapter-one",
      work: "novel",
      title: "失落的记忆",
      volume: "volume-a",
      sections: [{
        id: "section-a",
        title: "雨夜归来",
        order: 1,
        body: "小节正文",
        anchor: "section-1",
      }],
    })],
  });

  const server = await createServer({
    configFile: "vite.config.js",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  try {
    const { PublicRouter } = await server.ssrLoadModule("/src/site/router/PublicRouter.jsx");
    const workHtml = renderToString(React.createElement(PublicRouter, {
      content,
      route: "/works/novel",
      navigationType: "load",
    }));
    assert.match(workHtml, /第一卷 月影之章/);
    assert.match(workHtml, /卷简介文字/);

    const readerHtml = renderToString(React.createElement(PublicRouter, {
      content,
      route: "/works/novel/chapters/chapter-one",
      navigationType: "load",
    }));
    assert.match(readerHtml, /小节导航/);
    assert.match(readerHtml, /id="section-1"/);
    assert.match(readerHtml, /雨夜归来/);
  } finally {
    await server.close();
  }
});
