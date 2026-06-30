import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const interactiveSelector = [
  "button",
  "a[href]",
  "[role='button']",
  "[role='tab']",
].join(",");
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const copyText = async (text) => {
  const value = String(text || "").trim();
  if (!value) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
};

function textOf(element) {
  const label = element.getAttribute("aria-label")
    || element.getAttribute("title")
    || element.getAttribute("data-context-label")
    || element.textContent
    || "";
  return label.replace(/\s+/g, " ").trim() || "功能按钮";
}

function isDisabled(element) {
  return Boolean(
    element.disabled
    || element.getAttribute("aria-disabled") === "true"
    || element.matches("[disabled]"),
  );
}

function isEditableTarget(target) {
  return Boolean(target.closest?.([
    "input",
    "textarea",
    "select",
    "[contenteditable]:not([contenteditable='false'])",
    "[data-copy-allowed]",
  ].join(",")));
}

function functionalElementFrom(target, root) {
  if (!target?.closest || isEditableTarget(target)) return null;
  if (target.closest(".context-action-menu")) return null;
  const element = target.closest(interactiveSelector);
  if (!element || !root?.contains(element)) return null;
  if (element.closest("[data-context-menu='native']")) return null;
  return element;
}

function contextTitle(element) {
  if (element.matches("a[href]")) return "链接操作";
  if (element.getAttribute("role") === "tab") return "选项操作";
  if (element.classList.contains("bookmark-button") || element.hasAttribute("aria-pressed")) return "收藏操作";
  if (element.closest(".novel-reader")) return "阅读操作";
  if (element.closest(".protected-lightbox")) return "图片查看操作";
  if (element.closest(".illustrations-page")) return "图库操作";
  if (element.closest(".admin-shell")) return "管理操作";
  return "功能操作";
}

function actionLabel(element, label) {
  if (element.getAttribute("role") === "tab") return `切换到“${label}”`;
  if (element.classList.contains("bookmark-button")) {
    return element.getAttribute("aria-pressed") === "true" ? "取消收藏" : "收藏此项";
  }
  return `执行“${label}”`;
}

function linkHref(element) {
  const raw = element.getAttribute("href") || "";
  if (!raw) return "";
  if (raw.startsWith("#")) {
    return `${window.location.pathname}${window.location.search}${raw}`;
  }
  return element.href || raw;
}

function menuItemsFor(element) {
  const label = textOf(element);
  if (isDisabled(element)) {
    return {
      title: contextTitle(element),
      items: [{ id: "disabled", label: "当前不可用", disabled: true }],
    };
  }

  if (element.matches("a[href]")) {
    const href = linkHref(element);
    return {
      title: contextTitle(element),
      items: [
        { id: "open", label: `打开“${label}”`, action: () => element.click() },
        { id: "open-new", label: "在新标签页打开", hint: "New tab", action: () => window.open(element.href, "_blank", "noopener,noreferrer") },
        { id: "copy-link", label: "复制链接", action: () => copyText(href) },
        { id: "copy-label", label: "复制链接文字", action: () => copyText(label) },
      ],
    };
  }

  return {
    title: contextTitle(element),
    items: [
      { id: "run", label: actionLabel(element, label), action: () => element.click() },
      { id: "focus", label: "聚焦此按键", action: () => element.focus?.({ preventScroll: true }) },
      { id: "copy-label", label: "复制按键名称", action: () => copyText(label) },
    ],
  };
}

function clampPosition(x, y, width = 292, height = 220) {
  const margin = 10;
  return {
    x: Math.max(margin, Math.min(x, window.innerWidth - width - margin)),
    y: Math.max(margin, Math.min(y, window.innerHeight - height - margin)),
  };
}

export function ContextActionMenuProvider({ children }) {
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const lastTriggerRef = useRef(null);
  const [menu, setMenu] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const closeMenu = useCallback(() => setMenu(null), []);

  const openMenu = useCallback((element, point) => {
    const nextMenu = menuItemsFor(element);
    const enabledIndex = nextMenu.items.findIndex((item) => !item.disabled);
    lastTriggerRef.current = element;
    setActiveIndex(enabledIndex >= 0 ? enabledIndex : 0);
    setMenu({
      ...nextMenu,
      target: element,
      position: clampPosition(point.x, point.y),
    });
  }, []);

  const handleContextMenu = useCallback((event) => {
    const element = functionalElementFrom(event.target, rootRef.current);
    if (!element) {
      closeMenu();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    openMenu(element, { x: event.clientX, y: event.clientY });
  }, [closeMenu, openMenu]);

  const handleKeyDownCapture = useCallback((event) => {
    if (!(event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) return;
    const element = functionalElementFrom(document.activeElement, rootRef.current);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    event.preventDefault();
    event.stopPropagation();
    openMenu(element, { x: rect.left + 12, y: rect.bottom + 8 });
  }, [openMenu]);

  useIsomorphicLayoutEffect(() => {
    if (!menu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const position = clampPosition(menu.position.x, menu.position.y, rect.width, rect.height);
    if (position.x !== menu.position.x || position.y !== menu.position.y) {
      setMenu((current) => current ? { ...current, position } : current);
    }
  }, [menu]);

  useEffect(() => {
    if (!menu) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (!menuRef.current?.contains(event.target)) closeMenu();
    };
    const closeOnViewportChange = () => closeMenu();
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [closeMenu, menu]);

  useEffect(() => {
    if (!menu) return;
    const button = menuRef.current?.querySelector("[data-context-menu-item='true']:not(:disabled)");
    if (button) button.focus();
    else menuRef.current?.focus();
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const button = menuRef.current?.querySelector(`[data-context-menu-index="${activeIndex}"]:not(:disabled)`);
    button?.focus();
  }, [activeIndex, menu]);

  const enabledIndexes = useMemo(
    () => menu?.items.map((item, index) => item.disabled ? -1 : index).filter((index) => index >= 0) || [],
    [menu],
  );

  const runItem = useCallback((item) => {
    if (!item || item.disabled) return;
    Promise.resolve(item.action?.()).finally(() => {
      closeMenu();
      lastTriggerRef.current?.focus?.({ preventScroll: true });
    });
  }, [closeMenu]);

  const handleMenuKeyDown = (event) => {
    if (!menu) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      lastTriggerRef.current?.focus?.({ preventScroll: true });
      return;
    }
    if (!enabledIndexes.length) return;
    const currentEnabled = enabledIndexes.indexOf(activeIndex);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = enabledIndexes[(currentEnabled + direction + enabledIndexes.length) % enabledIndexes.length];
      setActiveIndex(next);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? enabledIndexes[0] : enabledIndexes[enabledIndexes.length - 1]);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      runItem(menu.items[activeIndex]);
    }
  };

  return (
    <div
      className="context-action-menu-root"
      ref={rootRef}
      onContextMenuCapture={handleContextMenu}
      onKeyDownCapture={handleKeyDownCapture}
    >
      {children}
      {menu ? (
        <div
          className="context-action-menu"
          ref={menuRef}
          role="menu"
          aria-label={menu.title}
          tabIndex={-1}
          style={{ left: `${menu.position.x}px`, top: `${menu.position.y}px` }}
          onKeyDown={handleMenuKeyDown}
        >
          <div className="context-action-menu-title">{menu.title}</div>
          {menu.items.map((item, index) => (
            <button
              type="button"
              role="menuitem"
              data-context-menu-item="true"
              data-context-menu-index={index}
              className={index === activeIndex ? "active" : ""}
              disabled={item.disabled}
              tabIndex={index === activeIndex && !item.disabled ? 0 : -1}
              onMouseEnter={() => {
                if (!item.disabled) setActiveIndex(index);
              }}
              onClick={() => runItem(item)}
              key={item.id}
            >
              <span>{item.label}</span>
              {item.hint ? <kbd>{item.hint}</kbd> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
