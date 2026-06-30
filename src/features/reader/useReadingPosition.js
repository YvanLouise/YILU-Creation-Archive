import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createReadingPosition,
  readReadingPosition,
  restoredScrollTop,
  writeReadingPosition,
} from "./readingPosition.js";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function waitForImages(root) {
  const pending = [...(root?.querySelectorAll("img") || [])]
    .filter((image) => !image.complete)
    .map((image) => new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    }));

  if (!pending.length) return Promise.resolve();
  return Promise.race([
    Promise.all(pending),
    new Promise((resolve) => window.setTimeout(resolve, 5000)),
  ]);
}

export function useReadingPosition(workSlug, chapterSlug, { enabled = true } = {}) {
  const rootRef = useRef(null);
  const readyRef = useRef(false);
  const saveFrameRef = useRef(0);
  const [restoring, setRestoring] = useState(false);

  useIsomorphicLayoutEffect(() => {
    if (!enabled || !workSlug || !chapterSlug) {
      readyRef.current = false;
      setRestoring(false);
      return undefined;
    }

    let cancelled = false;
    readyRef.current = false;
    const saved = readReadingPosition(localStorage, workSlug, chapterSlug);
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    if (!saved) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      readyRef.current = true;
      setRestoring(false);
      root.style.scrollBehavior = previousScrollBehavior;
      return undefined;
    }

    setRestoring(true);
    root.classList.add("reading-position-is-restoring");
    window.scrollTo({
      top: restoredScrollTop(saved, root.scrollHeight, window.innerHeight),
      left: 0,
      behavior: "auto",
    });

    waitForImages(rootRef.current).then(() => {
      if (cancelled) return;
      window.scrollTo({
        top: restoredScrollTop(saved, root.scrollHeight, window.innerHeight),
        left: 0,
        behavior: "auto",
      });
      readyRef.current = true;
      setRestoring(false);
      root.classList.remove("reading-position-is-restoring");
      root.style.scrollBehavior = previousScrollBehavior;
    });

    return () => {
      cancelled = true;
      root.classList.remove("reading-position-is-restoring");
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, [chapterSlug, enabled, workSlug]);

  useEffect(() => {
    if (!enabled || !workSlug || !chapterSlug) return undefined;

    const savePosition = () => {
      if (!readyRef.current) return;
      writeReadingPosition(
        localStorage,
        workSlug,
        chapterSlug,
        createReadingPosition(
          window.scrollY,
          document.documentElement.scrollHeight,
          window.innerHeight,
        ),
      );
    };
    const scheduleSave = () => {
      window.cancelAnimationFrame(saveFrameRef.current);
      saveFrameRef.current = window.requestAnimationFrame(savePosition);
    };
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") savePosition();
    };

    window.addEventListener("scroll", scheduleSave, { passive: true });
    window.addEventListener("pagehide", savePosition);
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      window.removeEventListener("scroll", scheduleSave);
      window.removeEventListener("pagehide", savePosition);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      window.cancelAnimationFrame(saveFrameRef.current);
      savePosition();
    };
  }, [chapterSlug, enabled, workSlug]);

  return { restoring, rootRef };
}
