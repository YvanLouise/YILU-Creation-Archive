import test from "node:test";
import assert from "node:assert/strict";
import {
  createReadingPosition,
  parseReadingPosition,
  readingPositionKey,
  restoredScrollTop,
} from "../src/features/reader/readingPosition.js";

test("reading positions are isolated by work and chapter", () => {
  assert.equal(
    readingPositionKey("moon-oath", "lantern"),
    "ilu-reader-position:moon-oath:lantern",
  );
});

test("reading position records pixels and progress ratio", () => {
  assert.deepEqual(
    { ...createReadingPosition(450, 2000, 500), savedAt: 0 },
    { top: 450, maximum: 1500, ratio: 0.3, savedAt: 0 },
  );
});

test("restoration keeps the exact pixel offset when document height changes", () => {
  const position = { top: 450, maximum: 1500, ratio: 0.3, savedAt: 1 };
  assert.equal(restoredScrollTop(position, 2000, 500), 450);
  assert.equal(restoredScrollTop(position, 3000, 500), 450);
});

test("invalid cached positions are ignored", () => {
  assert.equal(parseReadingPosition(null), null);
  assert.equal(parseReadingPosition({ top: "bad", maximum: 100, ratio: 0.5 }), null);
});
