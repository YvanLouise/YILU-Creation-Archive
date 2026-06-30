import test from "node:test";
import assert from "node:assert/strict";
import {
  createComicImageBlock,
  moveComicBlock,
  parseComicBody,
  serializeComicBody,
  validateComicBlocks,
} from "../src/features/comic-reader/domain.js";
import {
  buildComicEpisodeExportManifest,
  comicEpisodeExportFolderName,
  drawWatermarkedImageToPngBlob,
  safeComicFileNamePart,
} from "../src/features/comic-reader/exportComicPages.js";

test("comic page sequence round trips through Markdown", () => {
  const source = "开场说明\n\n![第一页](./uploads/first.png)\n\n![第二页](./uploads/second.png)";
  const blocks = parseComicBody(source);
  assert.deepEqual(blocks.map((block) => block.type), ["text", "image", "image"]);
  assert.equal(serializeComicBody(blocks), source);
});

test("comic pages can be reordered and require alt text", () => {
  const blocks = parseComicBody("![](./uploads/first.png)\n\n![第二页](./uploads/second.png)");
  assert.match(validateComicBlocks(blocks)[0], /替代文本/);
  const moved = moveComicBlock(blocks, blocks[1].id, blocks[0].id);
  assert.equal(moved[0].alt, "第二页");
});

test("draft media becomes a standard Markdown image block", () => {
  const block = createComicImageBlock({
    id: "page",
    name: "page-one.webp",
    path: "public/uploads/2026/06/page.webp",
  });
  assert.equal(block.src, "./uploads/2026/06/page.webp");
  assert.equal(serializeComicBody([block]), "![page-one](./uploads/2026/06/page.webp)");
});

test("comic episode export names current pages in reading order", () => {
  const work = { title: "月隐之誓", slug: "moon-oath" };
  const episode = { title: "失落的记忆", slug: "lost-memory", order: 3 };
  const manifest = buildComicEpisodeExportManifest({
    work,
    episode,
    source: "开场\n\n![第一页](./uploads/first.webp)\n\n![第二页](./uploads/second.png)",
  });

  assert.equal(comicEpisodeExportFolderName(work, episode), "月隐之誓_第03话_失落的记忆_导出");
  assert.deepEqual(
    manifest.map((entry) => [entry.pageIndex, entry.src, entry.fileName]),
    [
      [1, "./uploads/first.webp", "0001_月隐之誓_第03话_失落的记忆_P001.png"],
      [2, "./uploads/second.png", "0002_月隐之誓_第03话_失落的记忆_P002.png"],
    ],
  );
  assert.equal(safeComicFileNamePart("第 1 话：雨/夜*钟塔"), "第_1_话_雨_夜_钟塔");
});

test("comic export draws a YvanLouise watermark into a PNG blob", async () => {
  const calls = [];
  const image = { naturalWidth: 1000, naturalHeight: 1500 };
  const blob = await drawWatermarkedImageToPngBlob(image, {
    canvasFactory(width, height) {
      return {
        canvas: {
          width,
          height,
          toBlob(callback, type) {
            calls.push(["toBlob", type]);
            callback(new Blob(["png"], { type }));
          },
        },
        context: {
          drawImage(...args) { calls.push(["drawImage", ...args.slice(1)]); },
          save() { calls.push(["save"]); },
          restore() { calls.push(["restore"]); },
          strokeText(...args) { calls.push(["strokeText", ...args]); },
          fillText(...args) { calls.push(["fillText", ...args]); },
        },
      };
    },
  });

  assert.equal(blob.type, "image/png");
  assert.deepEqual(calls.find((call) => call[0] === "drawImage"), ["drawImage", 0, 0, 1000, 1500]);
  assert.equal(calls.find((call) => call[0] === "fillText")?.[1], "YvanLouise");
  assert.deepEqual(calls.find((call) => call[0] === "toBlob"), ["toBlob", "image/png"]);
});
