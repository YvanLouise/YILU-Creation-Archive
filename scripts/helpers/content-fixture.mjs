export function createWork(overrides = {}) {
  return {
    slug: "sample-work",
    type: "小说",
    title: "示例作品",
    subtitle: "",
    description: "用于测试的作品简介。",
    cover: "./assets/work-desk.png",
    genre: ["奇幻"],
    status: "连载中",
    progress: "第 1 章",
    date: "2026-06-01",
    createdAt: "2026-06-01T00:00:00.000Z",
    order: 1,
    hidden: false,
    ...overrides,
  };
}

export function createMarkdownItem(overrides = {}) {
  return {
    kind: "chapter",
    slug: "chapter-one",
    work: "sample-work",
    title: "第一章",
    summary: "用于测试的章节摘要。",
    cover: "./assets/work-desk.png",
    date: "2026-06-02",
    createdAt: "2026-06-02T00:00:00.000Z",
    status: "published",
    order: 1,
    body: "# 第一章\n\n正文。",
    ...overrides,
  };
}

export function createContent(overrides = {}) {
  const work = createWork();
  return {
    site: {
      brand: {
        name: "伊露创作档案馆",
        subtitle: "原创小说 · 漫画 · 世界与故事",
        email: "test@example.com",
      },
      author: {
        name: "伊露",
        intro: "创作者介绍。",
        avatar: "./assets/ilu-avatar.png",
      },
      featuredWorkSlug: work.slug,
      updatesSortMode: "createdAt",
      stats: [],
      socialLinks: [],
    },
    works: [work],
    chapters: [createMarkdownItem()],
    characters: [],
    notes: [],
    ...overrides,
  };
}
