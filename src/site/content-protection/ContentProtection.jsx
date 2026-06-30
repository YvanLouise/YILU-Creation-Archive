import React, { useEffect, useRef } from "react";
import { isCopyAllowedTarget, isImageTarget } from "./domain.js";

export function ContentProtection({ children, onNotice }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const blockProtectedAction = (event) => {
      if (isCopyAllowedTarget(event.target)) return;
      event.preventDefault();
      onNotice("本站内容受版权保护，暂不支持复制或下载。");
    };
    const blockImageDrag = (event) => {
      if (isCopyAllowedTarget(event.target) || !isImageTarget(event.target)) return;
      event.preventDefault();
      onNotice("本站内容受版权保护，暂不支持复制或下载。");
    };

    root.addEventListener("copy", blockProtectedAction);
    root.addEventListener("contextmenu", blockProtectedAction);
    root.addEventListener("selectstart", blockProtectedAction);
    root.addEventListener("dragstart", blockImageDrag);
    return () => {
      root.removeEventListener("copy", blockProtectedAction);
      root.removeEventListener("contextmenu", blockProtectedAction);
      root.removeEventListener("selectstart", blockProtectedAction);
      root.removeEventListener("dragstart", blockImageDrag);
    };
  }, [onNotice]);

  return (
    <div className="public-content-protection" ref={rootRef}>
      {children}
    </div>
  );
}
