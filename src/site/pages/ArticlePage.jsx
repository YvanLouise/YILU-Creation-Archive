import React from "react";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { ComicReader } from "../../features/comic-reader/ComicReader.jsx";
import { MarkdownView } from "../../features/markdown/MarkdownView.jsx";
import { useReadingPosition } from "../../features/reader/useReadingPosition.js";
import { BookmarkButton } from "../interaction/BookmarkButton.jsx";
import { entityKey } from "../interaction/domain.js";

export function ArticlePage({ content, item, backHref, backLabel, work }) {
  const isComic = item.kind === "chapter" && work?.type === "漫画";
  const comicChapters = isComic
    ? content.chapters
        .filter((chapter) => chapter.work === work.slug && chapter.status === "published")
        .sort((left, right) => left.order - right.order)
    : [];
  const currentComicIndex = comicChapters.findIndex((chapter) => chapter.slug === item.slug);
  const previousComic = currentComicIndex > 0 ? comicChapters[currentComicIndex - 1] : null;
  const nextComic = currentComicIndex >= 0 ? comicChapters[currentComicIndex + 1] : null;
  const { restoring, rootRef } = useReadingPosition(work?.slug, item.slug, {
    enabled: isComic,
  });
  return (
    <main
      ref={rootRef}
      className={`${isComic ? "comic-article-page" : "article-page"} section-shell${restoring ? " reading-position-restoring" : ""}`}
    >
      <div className="article-topbar">
        <a className="back-link" href={backHref}>
          <ArrowLeft size={16} />{backLabel}
        </a>
        <BookmarkButton
          className="article-bookmark"
          compact={isComic}
          entityKey={entityKey("chapter", item.slug, work?.slug)}
        />
      </div>
      <header>
        <div className="section-label">
          <span />
          {isComic
            ? "Comic episode"
            : item.kind === "chapter"
              ? "Chapter"
              : item.kind === "character"
                ? "Character"
                : "Note"}
        </div>
        <h1>{item.title}</h1>
        {item.summary ? <p>{item.summary}</p> : null}
        <time><CalendarDays size={15} />{item.date}</time>
      </header>
      {isComic
        ? (
            <>
              <ComicReader episode={item} source={item.body} work={work} />
              <nav className="comic-reader-bottom-nav" aria-label="漫画话数导航">
                {previousComic ? (
                  <a href={`#/works/${work.slug}/chapters/${previousComic.slug}`}>
                    <ArrowLeft size={16} />
                    <span>上一话</span>
                    <small>{previousComic.title}</small>
                  </a>
                ) : <span aria-hidden="true" />}
                <a href={`#/works/${work.slug}`} className="catalog">
                  目录
                </a>
                {nextComic ? (
                  <a href={`#/works/${work.slug}/chapters/${nextComic.slug}`}>
                    <span>下一话</span>
                    <small>{nextComic.title}</small>
                    <ArrowRight size={16} />
                  </a>
                ) : <span aria-hidden="true" />}
              </nav>
            </>
          )
        : <MarkdownView source={item.body} />}
    </main>
  );
}
