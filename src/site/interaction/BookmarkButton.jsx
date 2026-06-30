import React from "react";
import { Bookmark } from "lucide-react";
import { usePublicExperience } from "./PublicExperience.jsx";

export function BookmarkButton({ entityKey, className = "", compact = false }) {
  const { isBookmarked, toggleBookmark } = usePublicExperience();
  const active = isBookmarked(entityKey);
  return (
    <button
      className={`bookmark-button${active ? " active" : ""}${compact ? " compact" : ""}${className ? ` ${className}` : ""}`}
      type="button"
      aria-pressed={active}
      onClick={() => toggleBookmark(entityKey)}
    >
      <Bookmark size={compact ? 17 : 16} fill={active ? "currentColor" : "none"} />
      {compact ? null : active ? "已收藏" : "收藏"}
    </button>
  );
}
