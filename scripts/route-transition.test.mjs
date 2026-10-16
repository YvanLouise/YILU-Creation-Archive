import test from "node:test";
import assert from "node:assert/strict";
import {
  createRouteTransitionController,
  routeMotionFor,
} from "../src/app/routeTransition.js";

function deferred() {
  let resolve;
  const promise = new Promise((complete) => { resolve = complete; });
  return { promise, resolve };
}

function environment({ native = true, reduced = false, hidden = false, animations = true } = {}) {
  const attributes = new Map();
  const transitions = [];
  const entries = [];
  const doc = {
    documentElement: {
      setAttribute: (key, value) => attributes.set(key, value),
      removeAttribute: (key) => attributes.delete(key),
    },
    defaultView: { matchMedia: () => ({ matches: reduced }) },
    visibilityState: hidden ? "hidden" : "visible",
    querySelector: () => (animations ? {
      animate(frames, options) {
        const done = deferred();
        const entry = { frames, options, finished: done.promise, finish: done.resolve, cancelled: 0 };
        entry.cancel = () => { entry.cancelled += 1; done.resolve(); };
        entries.push(entry);
        return entry;
      },
    } : {}),
  };
  if (native) {
    doc.startViewTransition = (update) => {
      const done = deferred();
      const transition = { update, ready: Promise.resolve(), finished: done.promise, finish: done.resolve, skipped: 0 };
      transition.skipTransition = () => { transition.skipped += 1; done.resolve(); };
      transitions.push(transition);
      return transition;
    };
  }
  return { doc, attributes, transitions, entries, controller: createRouteTransitionController(doc) };
}

const sectionNavigation = { from: "/", to: "/works", navigationType: "direct" };

test("route motion distinguishes sections, drill-down and return navigation", () => {
  assert.equal(routeMotionFor("/", "/works"), "section");
  assert.equal(routeMotionFor("/works", "/works/story"), "forward");
  assert.equal(routeMotionFor("/works/story", "/works"), "backward");
  assert.equal(routeMotionFor("/", "/notes/draft"), "forward");
  assert.equal(routeMotionFor("/notes/draft", "/"), "backward");
  assert.equal(routeMotionFor("/notes", "/about"), "section");
});

test("initial load, same-page filters and anchors do not animate", () => {
  assert.equal(routeMotionFor("", "/works"), null);
  assert.equal(routeMotionFor("/", "/works", "load"), null);
  assert.equal(routeMotionFor("/works", "/works"), null);
});

test("chapter navigation stays immediate and history uses a quiet fade", () => {
  assert.equal(routeMotionFor("/works/story", "/works/story/chapters/one"), null);
  assert.equal(routeMotionFor("/works/story/chapters/one", "/works/story/chapters/two"), null);
  assert.equal(routeMotionFor("/works/story/chapters/one", "/works/story", "history"), null);
  assert.equal(routeMotionFor("/works/story", "/works", "history"), "history");
});

test("native snapshots commit the new route once and clean up on completion", async () => {
  const env = environment();
  let committed = 0;
  env.controller.navigate(sectionNavigation, () => { committed += 1; });
  assert.equal(committed, 0);
  assert.equal(env.attributes.get("data-route-motion"), "section");
  env.transitions[0].update();
  env.transitions[0].update();
  assert.equal(committed, 1);
  env.transitions[0].finish();
  await Promise.resolve();
  assert.equal(env.attributes.size, 0);
});

test("rapid navigation ignores skipped native update callbacks and stale completion", async () => {
  const env = environment();
  const committed = [];
  env.controller.navigate(sectionNavigation, () => committed.push("works"));
  env.controller.navigate({ from: "/works", to: "/works/story", navigationType: "direct" }, () => committed.push("story"));
  assert.equal(env.transitions[0].skipped, 1);
  env.transitions[0].update();
  env.transitions[1].update();
  await Promise.resolve();
  assert.deepEqual(committed, ["story"]);
  assert.equal(env.attributes.get("data-route-motion"), "forward");
  env.transitions[1].finish();
  await Promise.resolve();
  assert.equal(env.attributes.size, 0);
});

test("same-page updates cancel an in-flight transition without replaying animation", () => {
  const env = environment();
  const committed = [];
  env.controller.navigate(sectionNavigation, () => committed.push("stale"));
  env.controller.navigate({ from: "/works", to: "/works", navigationType: "direct" }, () => committed.push("filtered"));
  env.transitions[0].update();
  assert.deepEqual(committed, ["filtered"]);
  assert.equal(env.transitions.length, 1);
  assert.equal(env.attributes.size, 0);
});

test("reduced motion and background tabs commit immediately without snapshots", () => {
  for (const options of [{ reduced: true }, { hidden: true }]) {
    const env = environment(options);
    let committed = false;
    env.controller.navigate(sectionNavigation, () => { committed = true; });
    assert.equal(committed, true);
    assert.equal(env.transitions.length, 0);
    assert.equal(env.entries.length, 0);
    assert.equal(env.attributes.size, 0);
  }
});

test("unsupported browsers animate only the committed incoming page", async () => {
  const env = environment({ native: false });
  let committed = false;
  env.controller.navigate(sectionNavigation, () => { committed = true; });
  assert.equal(committed, true);
  assert.equal(env.entries[0].options.duration, 340);
  assert.equal(env.entries[0].frames[0].transform, "translate3d(0, 12px, 0)");
  env.entries[0].finish();
  await Promise.resolve();
  assert.equal(env.entries[0].cancelled, 1);
  assert.equal(env.attributes.size, 0);
});

test("history restoration never captures snapshots or translates the page", () => {
  const env = environment();
  env.controller.navigate({ ...sectionNavigation, navigationType: "history" }, () => {});
  assert.equal(env.transitions.length, 0);
  assert.deepEqual(env.entries[0].frames, [{ opacity: .65 }, { opacity: 1 }]);
  assert.equal(env.entries[0].options.duration, 160);
});

test("a synchronous snapshot failure falls back without dropping or duplicating navigation", () => {
  const env = environment();
  env.doc.startViewTransition = () => { throw new Error("capture unavailable"); };
  let committed = 0;
  env.controller.navigate(sectionNavigation, () => { committed += 1; });
  assert.equal(committed, 1);
  assert.equal(env.entries.length, 1);
});

test("navigation still works when neither animation API is available", () => {
  const env = environment({ native: false, animations: false });
  let committed = false;
  env.controller.navigate(sectionNavigation, () => { committed = true; });
  assert.equal(committed, true);
  assert.equal(env.attributes.size, 0);
});

test("disposing a controller prevents a pending native callback from updating an unmounted app", () => {
  const env = environment();
  let committed = false;
  env.controller.navigate(sectionNavigation, () => { committed = true; });
  env.controller.dispose();
  env.transitions[0].update();
  assert.equal(committed, false);
  assert.equal(env.transitions[0].skipped, 1);
  assert.equal(env.attributes.size, 0);
});
