import React from "react";
import { ArrowLeft, BookOpen, CalendarDays, NotebookPen, Pin } from "lucide-react";
import { MarkdownView } from "../markdown/MarkdownView.jsx";
import {
  noteCategory,
  noteFilterHref,
  noteTags,
  relatedWorkForNote,
} from "./domain.js";
import { BookmarkButton } from "../../site/interaction/BookmarkButton.jsx";
import { entityKey } from "../../site/interaction/domain.js";

export function NoteArticlePage({ content, item }) {
  const relatedWork = relatedWorkForNote(content, item);
  const tags = noteTags(item);
  return (
    <main className="article-page note-article-page section-shell">
      <div className="article-topbar">
        <a className="back-link" href="#/notes">
          <ArrowLeft size={16} />全部笔记
        </a>
        <BookmarkButton
          className="article-bookmark"
          entityKey={entityKey("note", item.slug)}
        />
      </div>
      <header>
        <div className="section-label"><span />Note</div>
        <div className="note-article-meta">
          {item.pinned ? <span><Pin size={13} />置顶</span> : null}
          <a href={noteFilterHref({ category: noteCategory(item) })}>
            <NotebookPen size={13} />{noteCategory(item)}
          </a>
          {relatedWork ? (
            <a href={`#/works/${relatedWork.slug}`}>
              <BookOpen size={13} />{relatedWork.title}
            </a>
          ) : null}
        </div>
        <h1>{item.title}</h1>
        {item.summary ? <p>{item.summary}</p> : null}
        <time><CalendarDays size={15} />{item.date}</time>
        {tags.length ? (
          <div className="note-article-tags">
            {tags.map((tag) => (
              <a href={noteFilterHref({ tag })} key={tag}>#{tag}</a>
            ))}
          </div>
        ) : null}
      </header>
      <MarkdownView source={item.body} />
    </main>
  );
}
