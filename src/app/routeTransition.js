const pageSelector = ".route-page-stage";
const chapterRoute = /^\/works\/[^/]+\/chapters\//;
const enterDuration = 340;
const enterEasing = "cubic-bezier(.22, 1, .36, 1)";

export function routeMotionFor(from, to, navigationType = "direct") {
  if (!from || !to || from === to || navigationType === "load"
    || chapterRoute.test(from) || chapterRoute.test(to)) return null;
  if (navigationType === "history") return "history";
  if (from !== "/" && to.startsWith(`${from}/`)) return "forward";
  if (to !== "/" && from.startsWith(`${to}/`)) return "backward";
  const fromDepth = from.split("/").filter(Boolean).length;
  const toDepth = to.split("/").filter(Boolean).length;
  if (toDepth > 1 && fromDepth < toDepth) return "forward";
  if (fromDepth > 1 && toDepth < fromDepth) return "backward";
  return "section";
}

function entryFrames(motion) {
  const offset = motion === "forward" ? "18px, 0"
    : motion === "backward" ? "-18px, 0" : "0, 12px";
  return motion === "history"
    ? [{ opacity: .65 }, { opacity: 1 }]
    : [{ opacity: 0, transform: `translate3d(${offset}, 0)` }, { opacity: 1, transform: "none" }];
}

export function createRouteTransitionController(doc) {
  let revision = 0;
  let active = null;
  const root = doc.documentElement;

  function cancel() {
    revision += 1;
    active?.skipTransition?.();
    active?.cancel?.();
    active = null;
    root.removeAttribute("data-route-motion");
  }

  function navigate({ from, to, navigationType }, update) {
    cancel();
    const current = revision;
    const motion = routeMotionFor(from, to, navigationType);
    const reducedMotion = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!motion || reducedMotion || doc.visibilityState === "hidden") {
      update();
      return;
    }

    let committed = false;
    const commit = () => {
      // A skipped native transition still invokes its update callback.
      if (current !== revision || committed) return;
      committed = true;
      update();
    };
    const complete = () => {
      if (current === revision) cancel();
    };
    root.setAttribute("data-route-motion", motion);

    if (motion !== "history" && typeof doc.startViewTransition === "function") {
      try {
        active = doc.startViewTransition(commit);
        active.ready.catch(() => {});
        active.finished.then(complete, complete);
        return;
      } catch {
        // Keep navigation functional if native snapshot capture is unavailable.
      }
    }

    commit();
    const stage = doc.querySelector(pageSelector);
    if (!stage?.animate) {
      complete();
      return;
    }
    active = stage.animate(entryFrames(motion), {
      duration: motion === "history" ? 160 : enterDuration,
      easing: enterEasing,
      fill: "both",
    });
    active.finished.then(complete, complete);
  }

  return { navigate, dispose: cancel };
}
