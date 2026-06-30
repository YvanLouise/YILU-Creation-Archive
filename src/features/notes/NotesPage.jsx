import React from "react";
import { ArrowRight, BookOpen, NotebookPen, Pin, X } from "lucide-react";
import { getWork } from "../../content-system/query/selectors.js";
import { EmptyState } from "../../shared/components/EmptyState.jsx";
import {
  noteCategory,
  noteFilterHref,
  noteTags,
  resolveNotesView,
} from "./domain.js";
import { SiteImage } from "../../site/interaction/SiteImage.jsx";

function FilterLink({ href, active, children }) {
  return (
    <a className={active ? "active" : ""} href={href}>
      {children}
    </a>
  );
}

export function NotesPage({ content, queryString = "" }) {
  const {
    filteredNotes,
    taxonomy,
    selectedCategory,
    selectedTag,
  } = resolveNotesView(content, queryString);

  return (
    <main className="notes-page section-shell">
      <header className="archive-heading">
        <div className="section-label"><span />Notes</div>
        <h1>创作笔记</h1>
        <p>记录练习、设定与不太成熟但真实的思考。这里不是资料堆，而是故事慢慢长出来的地方。</p>
      </header>

      <section className="notes-filter-panel" aria-label="创作笔记筛选">
        <div>
          <span>分类</span>
          <div className="notes-filter-row">
            <FilterLink
              href={noteFilterHref({ tag: selectedTag })}
              active={!selectedCategory}
            >
              全部
            </FilterLink>
            {taxonomy.categories.map((category) => (
              <FilterLink
                href={noteFilterHref({ category, tag: selectedTag })}
                active={selectedCategory === category}
                key={category}
              >
                {category}
              </FilterLink>
            ))}
          </div>
        </div>
        <div>
          <span>标签</span>
          <div className="notes-filter-row">
            <FilterLink
              href={noteFilterHref({ category: selectedCategory })}
              active={!selectedTag}
            >
              全部
            </FilterLink>
            {taxonomy.tags.map((tag) => (
              <FilterLink
                href={noteFilterHref({ category: selectedCategory, tag })}
                active={selectedTag === tag}
                key={tag}
              >
                #{tag}
              </FilterLink>
            ))}
          </div>
        </div>
        <div className="notes-filter-summary">
          <strong>{filteredNotes.length}</strong>
          <span>篇笔记</span>
          {(selectedCategory || selectedTag) ? (
            <a href="#/notes"><X size={14} />清空筛选</a>
          ) : null}
        </div>
      </section>

      <div className="notes-grid">
        {filteredNotes.map((note) => {
          const relatedWork = note.relatedWork ? getWork(content, note.relatedWork) : null;
          const tags = noteTags(note);
          return (
            <a className="note-card" href={`#/notes/${note.slug}`} key={note.slug}>
              <div className="note-card-cover">
                {note.cover ? (
                  <SiteImage src={note.cover} alt="" />
                ) : (
                  <NotebookPen size={34} />
                )}
                {note.pinned ? <span><Pin size={13} />置顶</span> : null}
              </div>
              <div className="note-card-copy">
                <div className="note-card-meta">
                  <span>{noteCategory(note)}</span>
                  <time>{note.date}</time>
                </div>
                <h2>{note.title}</h2>
                {note.summary ? <p>{note.summary}</p> : null}
                <div className="note-card-tags">
                  {tags.slice(0, 4).map((tag) => <i key={tag}>#{tag}</i>)}
                </div>
                {relatedWork ? (
                  <small><BookOpen size={13} />{relatedWork.title}</small>
                ) : null}
                <b>查看笔记 <ArrowRight size={15} /></b>
              </div>
            </a>
          );
        })}
        {!filteredNotes.length ? (
          <EmptyState
            icon={NotebookPen}
            title="还没有符合条件的笔记"
            description="换一个分类或标签看看，新的练习和设定整理会慢慢补上。"
          />
        ) : null}
      </div>
    </main>
  );
}
