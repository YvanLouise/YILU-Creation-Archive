import test from "node:test";
import assert from "node:assert/strict";
import { mergeDraftWithRepository } from "../src/admin/state/adminState.js";

test("admin draft hydrate keeps repository works missing from an old draft", () => {
  const repository = {
    site: {},
    works: [
      { slug: "moon", type: "小说", title: "月隐之誓", order: 1 },
      { slug: "essay", type: "小说", title: "杂文", order: 2 },
    ],
    chapters: [
      { slug: "moon-1", work: "moon", title: "第一章", order: 1 },
      { slug: "essay-1", work: "essay", title: "杂文一", order: 1 },
    ],
    characters: [],
    illustrations: [],
    notes: [],
  };
  const draft = {
    ...repository,
    works: [{ slug: "moon", type: "小说", title: "月隐之誓草稿", order: 1 }],
    chapters: [{ slug: "moon-1", work: "moon", title: "草稿第一章", order: 1 }],
  };

  const merged = mergeDraftWithRepository(repository, draft);

  assert.deepEqual(merged.works.map((work) => work.slug), ["moon", "essay"]);
  assert.equal(merged.works.find((work) => work.slug === "moon").title, "月隐之誓草稿");
  assert.equal(merged.works.find((work) => work.slug === "essay").title, "杂文");
  assert.deepEqual(merged.chapters.map((chapter) => chapter.slug), ["moon-1", "essay-1"]);
});

test("admin draft hydrate preserves volume and section structure data", () => {
  const repository = {
    site: {},
    works: [{
      slug: "moon",
      type: "小说",
      title: "月隐之誓",
      order: 1,
      chapterStructure: {
        enableVolumes: true,
        enableSections: true,
        volumeLabel: "卷",
        chapterLabel: "章",
        sectionLabel: "小节",
      },
      volumes: [{ id: "volume-a", title: "第一卷", order: 1, status: "visible" }],
    }],
    chapters: [{
      slug: "chapter-a",
      work: "moon",
      title: "第一章",
      order: 1,
      volume: "volume-a",
      sections: [{ id: "section-a", title: "正文 1", order: 1, body: "正文", anchor: "section-1" }],
    }],
    characters: [],
    illustrations: [],
    notes: [],
  };
  const draft = {
    ...repository,
    works: [{
      slug: "moon",
      type: "小说",
      title: "月隐之誓",
      order: 1,
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
      slug: "chapter-a",
      work: "moon",
      title: "第一章草稿",
      order: 1,
      volume: "",
      sections: [],
    }],
  };

  const merged = mergeDraftWithRepository(repository, draft);
  const work = merged.works[0];
  const chapter = merged.chapters[0];

  assert.equal(work.chapterStructure.enableVolumes, true);
  assert.equal(work.chapterStructure.enableSections, true);
  assert.deepEqual(work.volumes.map((volume) => volume.id), ["volume-a"]);
  assert.equal(chapter.volume, "volume-a");
  assert.deepEqual(chapter.sections.map((section) => section.id), ["section-a"]);
});
