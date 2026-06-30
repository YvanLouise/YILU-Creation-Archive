import test from "node:test";
import assert from "node:assert/strict";
import {
  characterArchiveId,
  characterGroups,
  characterNeighbors,
  relatedCharacters,
} from "../src/features/characters/domain.js";
import { createContent, createMarkdownItem, createWork } from "./helpers/content-fixture.mjs";

function character(overrides = {}) {
  return createMarkdownItem({
    kind: "character",
    slug: "celia",
    title: "赛莉娅",
    role: "见习绘图师",
    affiliation: "旧城地图工坊",
    profileStatus: "公开记录",
    aliases: [],
    traits: ["安静", "固执"],
    ...overrides,
  });
}

test("character archives group published records by visible work", () => {
  const secondWork = createWork({ slug: "second-work", title: "第二卷", order: 2 });
  const content = createContent({
    works: [createWork(), secondWork],
    characters: [
      character(),
      character({ slug: "traveler", title: "旅人", order: 2 }),
      character({ slug: "second", title: "第二卷人物", work: secondWork.slug }),
      character({ slug: "draft", title: "草稿", status: "draft", order: 3 }),
    ],
  });
  const groups = characterGroups(content);
  assert.deepEqual(groups.map((group) => group.work.title), ["示例作品", "第二卷"]);
  assert.deepEqual(groups[0].characters.map((item) => item.slug), ["celia", "traveler"]);
  assert.equal(characterArchiveId(groups[0].characters[0]), "CHAR-001");
});

test("character navigation and related records follow archive order", () => {
  const celia = character();
  const traveler = character({ slug: "traveler", title: "旅人", order: 2 });
  const content = createContent({ characters: [traveler, celia] });
  assert.equal(characterNeighbors(content, celia).next.slug, "traveler");
  assert.equal(characterNeighbors(content, traveler).previous.slug, "celia");
  assert.deepEqual(relatedCharacters(content, celia).map((item) => item.slug), ["traveler"]);
});

test("character archives keep published records without a work in a none group", () => {
  const content = createContent({
    characters: [
      character({ slug: "attached", title: "Attached", work: "sample-work", order: 1 }),
      character({ slug: "unassigned", title: "Unassigned", work: "", order: 2 }),
    ],
  });
  const groups = characterGroups(content);
  assert.deepEqual(groups.map((group) => group.work.slug), ["sample-work", "__none__"]);
  assert.equal(groups[1].work.title, "暂无");
  assert.equal(groups[1].work.isUnassigned, true);
  assert.deepEqual(groups[1].characters.map((item) => item.slug), ["unassigned"]);
});
