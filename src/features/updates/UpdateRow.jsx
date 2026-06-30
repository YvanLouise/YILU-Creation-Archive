import React from "react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Image as ImageIcon,
  NotebookPen,
  UserRound,
} from "lucide-react";
import { updateDisplayDate } from "./domain.js";
import { SiteImage } from "../../site/interaction/SiteImage.jsx";

function UpdateVisual({ update }) {
  if (update.image) return <SiteImage src={update.image} alt="" wrapperClassName="update-image" />;
  const Icon =
    update.filterType === "work"
      ? BookOpen
      : update.filterType === "comicEpisode"
        ? ImageIcon
        : update.filterType === "character"
          ? UserRound
          : update.filterType === "note"
            ? NotebookPen
            : FileText;
  return (
    <div className="update-placeholder" aria-hidden="true">
      <Icon size={24} />
    </div>
  );
}

export function UpdateRow({ update, sortMode }) {
  return (
    <a className="update-row" href={update.href}>
      <UpdateVisual update={update} />
      <div className="update-copy">
        <div className="update-meta">
          <span>{update.kindLabel}</span>
          {update.workTitle ? <b>{update.workTitle}</b> : null}
          <time>{updateDisplayDate(update, sortMode).replaceAll("-", ".")}</time>
        </div>
        <h3>{update.title}</h3>
        {update.summary ? <p>{update.summary}</p> : null}
      </div>
      <ArrowRight className="row-arrow" size={20} />
    </a>
  );
}
