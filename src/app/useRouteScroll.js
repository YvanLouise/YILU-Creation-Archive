import { useEffect, useLayoutEffect } from "react";
import { readReadingPosition } from "../features/reader/readingPosition.js";
import {
  isRestorableListRoute,
  restoredListScrollTop,
  scrollStorageKey,
} from "../site/interaction/domain.js";

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useRouteScroll(route, query, anchor, navigationType) {
  useBrowserLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    const chapterMatch = route.match(/^\/works\/([^/]+)\/chapters\/([^/]+)$/);
    const hasReadingPosition = !anchor
      && chapterMatch
      && readReadingPosition(localStorage, chapterMatch[1], chapterMatch[2]);
    if (hasReadingPosition) {
      root.style.scrollBehavior = previousScrollBehavior;
      return undefined;
    }
    const locationKey = `${route}${query ? `?${query}` : ""}`;
    const restoredTop = restoredListScrollTop(
      navigationType,
      route,
      sessionStorage.getItem(scrollStorageKey(locationKey)),
    );
    const resetScroll = () => {
      if (anchor) {
        document.getElementById(anchor)?.scrollIntoView({
          block: "start",
          behavior: "auto",
        });
      } else {
        window.scrollTo({ top: restoredTop, left: 0, behavior: "auto" });
      }
    };
    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    const timer = window.setTimeout(resetScroll, 80);
    const restoreTimer = window.setTimeout(() => {
      root.style.scrollBehavior = previousScrollBehavior;
    }, 120);
    return () => {
      if (isRestorableListRoute(route)) {
        sessionStorage.setItem(scrollStorageKey(locationKey), String(Math.max(0, Math.round(window.scrollY))));
      }
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.clearTimeout(restoreTimer);
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, [anchor, navigationType, query, route]);
}
