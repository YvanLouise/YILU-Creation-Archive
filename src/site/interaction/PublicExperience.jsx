import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Clock3,
  FolderHeart,
  Search,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  archiveStorageKey,
  normalizeArchiveState,
  recordRecentState,
  resolveArchiveEntry,
  routeEntityKey,
  toggleBookmarkState,
} from "./domain.js";
import { markDirectNavigation } from "./navigationIntent.js";
import { ContentProtection } from "../content-protection/ContentProtection.jsx";
import { SiteImage } from "./SiteImage.jsx";
import { ContextActionMenuProvider } from "../../shared/components/ContextActionMenuProvider.jsx";

const PublicExperienceContext = createContext(null);
const lightboxMinScale = 1;
const lightboxMaxScale = 5;

function clampLightboxScale(value) {
  return Math.max(lightboxMinScale, Math.min(lightboxMaxScale, Number(value) || lightboxMinScale));
}

function distanceBetween(first, second) {
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function centerBetween(first, second) {
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  };
}

function pointFromViewport(element, point) {
  const rect = element.getBoundingClientRect();
  return {
    x: point.x - rect.left - rect.width / 2,
    y: point.y - rect.top - rect.height / 2,
  };
}

function viewForScale(current, nextScale) {
  const scale = clampLightboxScale(nextScale);
  return {
    ...current,
    scale,
    x: scale <= 1 ? 0 : current.x || 0,
    y: scale <= 1 ? 0 : current.y || 0,
  };
}

function resetLightboxView(current) {
  return {
    ...current,
    scale: 1,
    x: 0,
    y: 0,
  };
}

function readArchiveState() {
  try {
    return normalizeArchiveState(JSON.parse(localStorage.getItem(archiveStorageKey) || "null"));
  } catch {
    return normalizeArchiveState(null);
  }
}

export function usePublicExperience() {
  const value = useContext(PublicExperienceContext);
  if (!value) throw new Error("usePublicExperience must be used within PublicExperienceProvider");
  return value;
}

export function useOptionalPublicExperience() {
  return useContext(PublicExperienceContext);
}

export function PublicExperienceProvider({
  content,
  route,
  query,
  navigationType,
  children,
}) {
  const [archiveState, setArchiveState] = useState(readArchiveState);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState("bookmarks");
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [notice, setNotice] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const noticeTimerRef = useRef(0);
  const transitionTimerRef = useRef(0);
  const chapterMatch = route.match(/^\/works\/([^/]+)\/chapters\/([^/]+)$/);
  const currentChapterWork = chapterMatch
    ? content.works.find((work) => work.slug === chapterMatch[1])
    : null;
  const isNovelReader = currentChapterWork?.type === "小说";

  const notify = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 2200);
  }, []);

  const toggleBookmark = useCallback((key) => {
    setArchiveState((current) => {
      const bookmarked = current.bookmarks.some((entry) => entry.key === key);
      notify(bookmarked ? "已从收藏中移除。" : "已收藏到我的档案。");
      return toggleBookmarkState(current, key);
    });
  }, [notify]);

  const clearRecent = useCallback(() => {
    setArchiveState((current) => ({ ...current, recent: [] }));
    notify("最近浏览已清空。");
  }, [notify]);

  useEffect(() => {
    localStorage.setItem(archiveStorageKey, JSON.stringify(archiveState));
  }, [archiveState]);

  useEffect(() => {
    const key = routeEntityKey(route);
    if (!key) return;
    setArchiveState((current) => recordRecentState(current, key));
  }, [route]);

  useLayoutEffect(() => {
    setArchiveOpen(false);
    if (navigationType === "history" || routeEntityKey(route)?.startsWith("chapter:")) {
      setTransitioning(false);
      return undefined;
    }
    setTransitioning(true);
    window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => setTransitioning(false), 280);
    return () => window.clearTimeout(transitionTimerRef.current);
  }, [navigationType, query, route]);

  useEffect(() => () => {
    window.clearTimeout(noticeTimerRef.current);
    window.clearTimeout(transitionTimerRef.current);
  }, []);

  const overlayOpen = archiveOpen || navigationOpen || Boolean(lightbox);
  useEffect(() => {
    if (!overlayOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!archiveOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setArchiveOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [archiveOpen]);

  const bookmarks = useMemo(
    () => archiveState.bookmarks.map((entry) => resolveArchiveEntry(content, entry)).filter(Boolean),
    [archiveState.bookmarks, content],
  );
  const recent = useMemo(
    () => archiveState.recent.map((entry) => resolveArchiveEntry(content, entry)).filter(Boolean),
    [archiveState.recent, content],
  );
  const value = useMemo(() => ({
    archiveOpen,
    closeArchive: () => setArchiveOpen(false),
    isBookmarked: (key) => archiveState.bookmarks.some((entry) => entry.key === key),
    lightbox,
    hidePublicFooter: isNovelReader,
    navigationOpen,
    notify,
    openArchive: (tab = "bookmarks") => {
      setArchiveTab(tab);
      setArchiveOpen(true);
    },
    openLightbox: (items, index = 0, trigger = null) => setLightbox({ items, index, trigger, scale: 1, x: 0, y: 0 }),
    routeKey: `${route}?${query}`,
    closeLightbox: () => setLightbox(null),
    setLightbox,
    setNavigationOpen,
    toggleBookmark,
  }), [
    archiveOpen,
    archiveState.bookmarks,
    lightbox,
    navigationOpen,
    notify,
    query,
    route,
    isNovelReader,
    toggleBookmark,
  ]);
  const archiveItems = archiveTab === "bookmarks" ? bookmarks : recent;

  return (
    <PublicExperienceContext.Provider value={value}>
      <ContextActionMenuProvider>
        <ContentProtection onNotice={notify}>
          <div
            className={`public-experience${transitioning ? " is-transitioning" : ""}`}
            onClickCapture={(event) => {
              const link = event.target.closest?.("a[href^='#/']");
              if (link) markDirectNavigation();
            }}
          >
            <div className="route-progress-line" aria-hidden="true" />
            {children}
            <GlobalReadingTools hidden={archiveOpen || navigationOpen || Boolean(lightbox) || isNovelReader} />
            <ArchiveDrawer
              activeTab={archiveTab}
              items={archiveItems}
              onChangeTab={setArchiveTab}
              onClearRecent={clearRecent}
              onClose={() => setArchiveOpen(false)}
              onToggleBookmark={toggleBookmark}
              open={archiveOpen}
            />
            <ProtectedLightbox
              lightbox={lightbox}
              setLightbox={setLightbox}
            />
            <div
              className={notice ? "experience-notice visible" : "experience-notice"}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <FolderHeart size={17} aria-hidden="true" />
              <span>{notice}</span>
            </div>
          </div>
        </ContentProtection>
      </ContextActionMenuProvider>
    </PublicExperienceContext.Provider>
  );
}

function ProtectedLightbox({ lightbox, setLightbox }) {
  const dialogRef = useRef(null);
  const viewportRef = useRef(null);
  const pointersRef = useRef(new Map());
  const dragRef = useRef(null);
  const gestureRef = useRef(null);
  const lightboxRef = useRef(lightbox);
  lightboxRef.current = lightbox;
  useEffect(() => {
    if (!lightbox) return undefined;
    const trigger = lightbox.trigger;
    const handleKey = (event) => {
      const currentLightbox = lightboxRef.current;
      if (!currentLightbox) return;
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowLeft" && currentLightbox.items.length > 1) {
        setLightbox((current) => ({
          ...resetLightboxView(current),
          index: (current.index - 1 + current.items.length) % current.items.length,
        }));
      }
      if (event.key === "ArrowRight" && currentLightbox.items.length > 1) {
        setLightbox((current) => ({
          ...resetLightboxView(current),
          index: (current.index + 1) % current.items.length,
        }));
      }
      if (event.key === "Tab") {
        if (!dialogRef.current) return;
        const controls = [...dialogRef.current.querySelectorAll("button:not([disabled]):not([tabindex='-1'])")];
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    window.requestAnimationFrame(() => dialogRef.current?.querySelector(".lightbox-close")?.focus());
    return () => {
      window.removeEventListener("keydown", handleKey);
      trigger?.focus?.();
    };
  }, [Boolean(lightbox), setLightbox]);
  useEffect(() => {
    pointersRef.current.clear();
    dragRef.current = null;
    gestureRef.current = null;
  }, [lightbox?.index, lightbox?.items?.[lightbox?.index]?.src]);
  if (!lightbox) return null;
  const item = lightbox.items[lightbox.index];
  const scale = lightbox.scale || 1;
  const offsetX = lightbox.x || 0;
  const offsetY = lightbox.y || 0;
  const updateScale = (next) => setLightbox((current) => viewForScale(current, next));
  const updateScaleAtPoint = (next, point) => {
    const viewport = viewportRef.current;
    if (!viewport || !point) {
      updateScale(next);
      return;
    }
    setLightbox((current) => {
      const currentScale = current.scale || 1;
      const nextScale = clampLightboxScale(next);
      if (nextScale <= 1) return resetLightboxView(current);
      const focus = pointFromViewport(viewport, point);
      const ratio = nextScale / currentScale;
      return {
        ...current,
        scale: nextScale,
        x: focus.x - (focus.x - (current.x || 0)) * ratio,
        y: focus.y - (focus.y - (current.y || 0)) * ratio,
      };
    });
  };
  const move = (direction) => setLightbox((current) => ({
    ...resetLightboxView(current),
    index: (current.index + direction + current.items.length) % current.items.length,
  }));
  const resetView = () => setLightbox((current) => resetLightboxView(current));
  const handleWheel = (event) => {
    event.preventDefault();
    updateScaleAtPoint(scale - event.deltaY * 0.002, { x: event.clientX, y: event.clientY });
  };
  const handlePointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, event);
    if (pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()].slice(-2);
      const center = centerBetween(first, second);
      gestureRef.current = {
        distance: Math.max(1, distanceBetween(first, second)),
        focus: pointFromViewport(event.currentTarget, center),
        scale,
        x: offsetX,
        y: offsetY,
      };
      dragRef.current = null;
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: offsetX,
      y: offsetY,
    };
  };
  const handlePointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    pointersRef.current.set(event.pointerId, event);
    if (pointersRef.current.size >= 2 && gestureRef.current) {
      const [first, second] = [...pointersRef.current.values()].slice(-2);
      const gesture = gestureRef.current;
      const currentFocus = pointFromViewport(event.currentTarget, centerBetween(first, second));
      const nextScale = clampLightboxScale(gesture.scale * (distanceBetween(first, second) / gesture.distance));
      const ratio = nextScale / gesture.scale;
      setLightbox((current) => ({
        ...current,
        scale: nextScale,
        x: currentFocus.x - (gesture.focus.x - gesture.x) * ratio,
        y: currentFocus.y - (gesture.focus.y - gesture.y) * ratio,
      }));
      return;
    }
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId || scale <= 1) return;
    const drag = dragRef.current;
    setLightbox((current) => ({
      ...current,
      x: drag.x + event.clientX - drag.startX,
      y: drag.y + event.clientY - drag.startY,
    }));
  };
  const handlePointerEnd = (event) => {
    pointersRef.current.delete(event.pointerId);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    gestureRef.current = null;
    dragRef.current = null;
    const [remaining] = pointersRef.current.values();
    if (remaining) {
      dragRef.current = {
        pointerId: remaining.pointerId,
        startX: remaining.clientX,
        startY: remaining.clientY,
        x: lightboxRef.current?.x || 0,
        y: lightboxRef.current?.y || 0,
      };
    }
  };
  return (
    <div className="protected-lightbox" role="dialog" aria-modal="true" aria-label="图片沉浸查看" ref={dialogRef}>
      <button className="lightbox-backdrop" type="button" tabIndex={-1} aria-label="关闭图片查看" onClick={() => setLightbox(null)} />
      <header>
        <div><span>{lightbox.index + 1} / {lightbox.items.length}</span><strong>{item.caption || item.alt}</strong></div>
        <div>
          <button type="button" onClick={() => updateScale(scale - .35)} disabled={scale <= 1} aria-label="缩小"><Minus size={17} /></button>
          <button type="button" onClick={resetView} aria-label="重置缩放"><RotateCcw size={17} /></button>
          <button type="button" onClick={() => updateScale(scale + .35)} disabled={scale >= lightboxMaxScale} aria-label="放大"><Plus size={17} /></button>
          <button className="lightbox-close" type="button" onClick={() => setLightbox(null)} aria-label="关闭"><X size={19} /></button>
        </div>
      </header>
      <div className="lightbox-canvas">
        {lightbox.items.length > 1 ? <button className="lightbox-previous" type="button" onClick={() => move(-1)} aria-label="上一张"><ChevronLeft size={24} /></button> : null}
        <div
          className={`lightbox-image-scroll${scale > 1 ? " is-zoomed" : ""}`}
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onWheel={handleWheel}
        >
          <img
            src={item.src}
            alt={item.alt}
            draggable="false"
            style={{ transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})` }}
            onDoubleClick={(event) => updateScaleAtPoint(scale > 1 ? 1 : 2.4, { x: event.clientX, y: event.clientY })}
            onDragStart={(event) => event.preventDefault()}
          />
        </div>
        {lightbox.items.length > 1 ? <button className="lightbox-next" type="button" onClick={() => move(1)} aria-label="下一张"><ChevronRight size={24} /></button> : null}
      </div>
      {item.caption ? <footer>{item.caption}</footer> : null}
    </div>
  );
}

function GlobalReadingTools({ hidden }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => {
      const maximum = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(window.scrollY > 280);
      setProgress(maximum > 0 ? Math.min(100, Math.round((window.scrollY / maximum) * 100)) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  const shown = visible && !hidden;
  return (
    <aside
      className={`global-reading-tools${shown ? " visible" : ""}`}
      aria-label="页面辅助工具"
      aria-hidden={!shown}
      inert={shown ? undefined : ""}
      style={{ "--page-progress": `${progress}%` }}
    >
      <span className="global-progress" aria-label={`页面进度 ${progress}%`}><i /></span>
      <a href="#/search" aria-label="搜索站内内容"><Search size={17} /></a>
      <button
        type="button"
        aria-label="返回页面顶部"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUp size={17} />
      </button>
    </aside>
  );
}

function ArchiveDrawer({
  activeTab,
  items,
  onChangeTab,
  onClearRecent,
  onClose,
  onToggleBookmark,
  open,
}) {
  return (
    <>
      <button
        className={open ? "archive-drawer-scrim visible" : "archive-drawer-scrim"}
        type="button"
        aria-label="关闭我的档案"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside className={open ? "archive-drawer open" : "archive-drawer"} aria-hidden={!open} inert={open ? undefined : ""}>
        <header>
          <div><span>Personal archive</span><h2>我的档案</h2></div>
          <button type="button" onClick={onClose} aria-label="关闭我的档案"><X size={19} /></button>
        </header>
        <div className="archive-drawer-tabs" role="tablist">
          <button className={activeTab === "bookmarks" ? "active" : ""} type="button" role="tab" aria-selected={activeTab === "bookmarks"} onClick={() => onChangeTab("bookmarks")}><Bookmark size={15} />收藏</button>
          <button className={activeTab === "recent" ? "active" : ""} type="button" role="tab" aria-selected={activeTab === "recent"} onClick={() => onChangeTab("recent")}><Clock3 size={15} />最近浏览</button>
        </div>
        <div className="archive-drawer-list">
          {items.map((item) => (
            <article key={item.key}>
              <a href={item.href} onClick={onClose}>
                {item.image ? <SiteImage src={item.image} alt="" /> : <span>{item.title.slice(0, 1)}</span>}
                <div><small>{item.kindLabel}{item.subtitle ? ` · ${item.subtitle}` : ""}</small><strong>{item.title}</strong></div>
              </a>
              {activeTab === "bookmarks" ? <button type="button" onClick={() => onToggleBookmark(item.key)} aria-label={`取消收藏${item.title}`}><X size={14} /></button> : null}
            </article>
          ))}
          {!items.length ? <p>{activeTab === "bookmarks" ? "收藏喜欢的作品、章节、角色或笔记，它们会出现在这里。" : "浏览过的公开档案会记录在这里。"}</p> : null}
        </div>
        {activeTab === "recent" && items.length ? <button className="archive-clear-recent" type="button" onClick={onClearRecent}><Trash2 size={15} />清空最近浏览</button> : null}
      </aside>
    </>
  );
}
