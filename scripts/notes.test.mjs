import test from "node:test";
import assert from "node:assert/strict";
import {
  filterNotes,
  noteFilterHref,
  noteTaxonomy,
  resolveHomeNotes,
  resolveNotesView,
  sortPublicNotes,
} from "../src/features/notes/domain.js";
import { normalizeNote } from "../src/content-system/model/normalize.js";

function note(overrides = {}) {
  return {
    kind: "note",
    slug: "note",
    title: "笔记",
    summary: "",
    date: "2026-06-01",
    createdAt: "",
    status: "published",
    order: 1,
    cover: "",
    body: "",
    ...overrides,
  };
}

test("legacy notes receive lightweight library defaults", () => {
  assert.deepEqual(
    normalizeNote(note()),
    {
      category: "创作笔记",
      tags: [],
      pinned: false,
      relatedWork: "",
      ...note(),
    },
  );
});

test("public notes sort pinned first and then by date", () => {
  const notes = sortPublicNotes([
    note({ slug: "old", title: "旧", date: "2026-05-01", order: 1 }),
    note({ slug: "new", title: "新", date: "2026-06-01", order: 2 }),
    note({ slug: "pin", title: "置顶", date: "2026-04-01", order: 3, pinned: true }),
  ]);
  assert.deepEqual(notes.map((item) => item.slug), ["pin", "new", "old"]);
});

test("note taxonomy and combined filters are stable", () => {
  const notes = [
    note({ slug: "world", category: "世界观", tags: ["城市", "月灯"] }),
    note({ slug: "drawing", category: "绘画练习", tags: ["分镜"] }),
  ];
  assert.deepEqual(noteTaxonomy(notes), {
    categories: ["绘画练习", "世界观"],
    tags: ["城市", "分镜", "月灯"],
  });
  assert.deepEqual(
    filterNotes(notes, { category: "世界观", tag: "城市" }).map((item) => item.slug),
    ["world"],
  );
});

test("notes view restores valid URL filters", () => {
  const content = {
    notes: [
      note({ slug: "world", category: "世界观", tags: ["城市"] }),
      note({ slug: "drawing", category: "绘画练习", tags: ["分镜"] }),
    ],
  };
  const view = resolveNotesView(
    content,
    "category=%E4%B8%96%E7%95%8C%E8%A7%82&tag=%E5%9F%8E%E5%B8%82",
  );
  assert.equal(view.selectedCategory, "世界观");
  assert.equal(view.selectedTag, "城市");
  assert.deepEqual(view.filteredNotes.map((item) => item.slug), ["world"]);
  assert.equal(noteFilterHref({ category: "世界观", tag: "城市" }), "#/notes?category=%E4%B8%96%E7%95%8C%E8%A7%82&tag=%E5%9F%8E%E5%B8%82");
});

test("home notes expose at most the requested pinned/latest items", () => {
  const content = {
    notes: [
      note({ slug: "one", date: "2026-06-01" }),
      note({ slug: "two", date: "2026-06-02" }),
      note({ slug: "three", date: "2026-05-01", pinned: true }),
    ],
  };
  assert.deepEqual(
    resolveHomeNotes(content, 2).map((item) => item.slug),
    ["three", "two"],
  );
});
