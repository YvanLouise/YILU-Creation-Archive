import test from "node:test";
import assert from "node:assert/strict";
import {
  copyAllowedSelector,
  isCopyAllowedTarget,
  isImageTarget,
} from "../src/site/content-protection/domain.js";

function targetMatching(matches) {
  return {
    closest(selector) {
      return matches.includes(selector) ? { selector } : null;
    },
  };
}

test("copy protection allows editable and explicitly opted-out regions", () => {
  const editable = {
    closest(selector) {
      return selector === copyAllowedSelector ? { selector } : null;
    },
  };
  assert.equal(isCopyAllowedTarget(editable), true);
  assert.equal(isCopyAllowedTarget(targetMatching([])), false);
  assert.equal(isCopyAllowedTarget(null), false);
});

test("image targets are detected through nested event targets", () => {
  assert.equal(isImageTarget(targetMatching(["img"])), true);
  assert.equal(isImageTarget(targetMatching([])), false);
});
