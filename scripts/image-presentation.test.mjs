import test from "node:test";
import assert from "node:assert/strict";
import { illustrationSchema } from "../src/content-system/model/schema.js";
import {
  imagePresentationStyle,
  isCustomImagePresentation,
  normalizeImagePresentation,
} from "../src/shared/imagePresentation.js";

test("image presentation clamps persisted focus and zoom values", () => {
  assert.deepEqual(normalizeImagePresentation({ focusX: -20, focusY: 130, zoom: 8 }), {
    focusX: 0,
    focusY: 100,
    zoom: 3,
  });
  assert.deepEqual(normalizeImagePresentation(), { focusX: 50, focusY: 50, zoom: 1 });
  assert.ok(normalizeImagePresentation({ focusX: 78, focusY: 50, zoom: 1 }).zoom > 1);
});

test("image presentation exposes CSS variables only for a custom display", () => {
  assert.equal(isCustomImagePresentation(), false);
  assert.equal(isCustomImagePresentation({ focusX: 60, focusY: 50, zoom: 1 }), true);
  assert.deepEqual(imagePresentationStyle({ focusX: 62.5, focusY: 38, zoom: 1.4 }), {
    "--image-focus-x": "62.5%",
    "--image-focus-y": "38%",
    "--image-zoom": "1.4",
  });
});

test("illustration schema accepts valid image presentation and rejects invalid values", () => {
  const illustration = {
    slug: "crop-test",
    title: "裁切测试",
    summary: "测试展示区域参数。",
    image: "./assets/work-desk.png",
    imagePresentation: { focusX: 35, focusY: 68, zoom: 1.8 },
    category: "场景",
    series: "",
    date: "2026-07-11",
    order: 1,
    status: "draft",
    featured: false,
  };
  assert.equal(illustrationSchema.safeParse(illustration).success, true);
  assert.equal(illustrationSchema.safeParse({
    ...illustration,
    imagePresentation: { focusX: 101, focusY: 50, zoom: .8 },
  }).success, false);
});
