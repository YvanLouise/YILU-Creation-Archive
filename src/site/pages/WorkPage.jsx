import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { exportComicEpisodePages } from "../../features/comic-reader/exportComicPages.js";
import { ButtonLink } from "../../shared/components/ButtonLink.jsx";
import { BookmarkButton } from "../interaction/BookmarkButton.jsx";
import { entityKey } from "../interaction/domain.js";
import { ProtectedImage } from "../interaction/ProtectedImage.jsx";
import { useOptionalPublicExperience } from "../interaction/PublicExperience.jsx";
import { SiteImage } from "../interaction/SiteImage.jsx";
import {
  chapterHref,
  groupChaptersByVolume,
} from "../../content-system/model/novelStructure.js";

export function WorkPage({ content, work }) {
  const experience = useOptionalPublicExperience();
  const chapters = content.chapters.filter(
    (chapter) =>
      chapter.work === work.slug &&
      chapter.status === "published",
  );
  const characters = content.characters.filter(
    (character) =>
      character.work === work.slug &&
      character.status === "published",
  );
  const isComic = work.type === "漫画";
  const chapterGroups = useMemo(
    () => isComic ? [] : groupChaptersByVolume(work, chapters),
    [chapters, isComic, work],
  );
  const [exporting, setExporting] = useState(false);
  const [selectedEpisodeSlug, setSelectedEpisodeSlug] = useState("");
  const selectedEpisode = useMemo(
    () => chapters.find((chapter) => chapter.slug === selectedEpisodeSlug) || chapters[0],
    [chapters, selectedEpisodeSlug],
  );

  useEffect(() => {
    if (!isComic || !chapters.length) return;
    if (!chapters.some((chapter) => chapter.slug === selectedEpisodeSlug)) {
      setSelectedEpisodeSlug(chapters[0].slug);
    }
  }, [chapters, isComic, selectedEpisodeSlug]);

  const exportSelectedEpisode = async () => {
    if (!selectedEpisode || exporting) return;
    setExporting(true);
    try {
      const result = await exportComicEpisodePages({
        work,
        episode: selectedEpisode,
        source: selectedEpisode.body,
      });
      if (result.mode === "directory") {
        experience?.notify?.(`已导出 ${result.count} 张漫画页到“${result.folderName}”。`);
      } else {
        experience?.notify?.(`已开始下载 ${result.count} 张漫画页。`);
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        experience?.notify?.("已取消导出。");
      } else {
        experience?.notify?.(error.message || "漫画页导出失败。");
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className={`work-page${isComic ? " is-comic" : ""}`}>
      <section className="work-page-hero section-shell">
        <div>
          <a className="back-link" href="#/works">
            <ArrowLeft size={16} />全部作品
          </a>
          <div className="section-label">
            <span />{work.type} · {work.status}
          </div>
          <h1>{work.title}</h1>
          <p className="hero-subtitle">{work.subtitle}</p>
          <p>{work.description}</p>
          <div className="button-row">
            {chapters[0] ? (
              <ButtonLink
                href={`#/works/${work.slug}/chapters/${chapters[0].slug}`}
              >
                {isComic ? "开始阅读" : "从第一章开始"}
              </ButtonLink>
            ) : null}
            <BookmarkButton entityKey={entityKey("work", work.slug)} />
          </div>
        </div>
        <ProtectedImage
          wrapperClassName="work-cover-viewer"
          src={work.cover}
          presentation={work.coverPresentation}
          alt={`${work.title}封面`}
          caption={`${work.title}封面`}
        />
      </section>
      <section className="section-shell work-detail-grid">
        <div>
          <div className="section-heading">
            <div>
              <div className="section-label">
                <span />{isComic ? "Episodes" : "Chapters"}
              </div>
              <h2>{isComic ? "话数目录" : "章节目录"}</h2>
            </div>
            {isComic && chapters.length ? (
              <div className="comic-directory-export">
                <select
                  value={selectedEpisode?.slug || ""}
                  onChange={(event) => setSelectedEpisodeSlug(event.target.value)}
                  aria-label="选择要导出的话数"
                >
                  {chapters.map((chapter) => (
                    <option value={chapter.slug} key={chapter.slug}>
                      第 {chapter.order} 话 · {chapter.title}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={exportSelectedEpisode} disabled={exporting || !selectedEpisode}>
                  <Download size={15} />
                  {exporting ? "正在导出" : "导出本话"}
                </button>
              </div>
            ) : null}
          </div>
          <div className="chapter-list">
            {(isComic ? chapters : []).map((chapter) => (
              <a
                href={`#/works/${work.slug}/chapters/${chapter.slug}`}
                key={chapter.slug}
              >
                <SiteImage
                  src={chapter.cover || work.cover}
                  presentation={chapter.coverPresentation || work.coverPresentation}
                  alt=""
                  wrapperClassName="chapter-cover-thumb"
                />
                <b>
                  {isComic
                    ? `第 ${chapter.order} 话`
                    : String(chapter.order).padStart(2, "0")}
                </b>
                <div>
                  <h3>{chapter.title}</h3>
                  {chapter.summary ? <p>{chapter.summary}</p> : null}
                </div>
                <ArrowRight size={18} />
              </a>
            ))}
            {!isComic ? chapterGroups.map((group) => (
              <section className="chapter-volume-group" key={group.id}>
                {group.volume ? (
                  <header>
                    <h3>{group.volume.title}</h3>
                    {group.volume.summary ? <p>{group.volume.summary}</p> : null}
                  </header>
                ) : null}
                {group.chapters.map((chapter) => (
                  <a
                    href={chapterHref(work.slug, chapter.slug)}
                    key={chapter.slug}
                  >
                    <SiteImage
                      src={chapter.cover || work.cover}
                      presentation={chapter.coverPresentation || work.coverPresentation}
                      alt=""
                      wrapperClassName="chapter-cover-thumb"
                    />
                    <b>{String(chapter.order).padStart(2, "0")}</b>
                    <div>
                      <h3>{chapter.title}</h3>
                      {chapter.summary ? <p>{chapter.summary}</p> : null}
                    </div>
                    <ArrowRight size={18} />
                  </a>
                ))}
              </section>
            )) : null}
          </div>
        </div>
        <aside id="settings">
          <h2>作品信息</h2>
          <dl>
            <div><dt>类型</dt><dd>{work.genre.join(" · ")}</dd></div>
            <div><dt>进度</dt><dd>{work.progress}</dd></div>
            <div><dt>状态</dt><dd>{work.status}</dd></div>
            {isComic ? (
              <div>
                <dt>更新</dt>
                <dd>{work.updateFrequency || "更新频率未定"}</dd>
              </div>
            ) : null}
          </dl>
          <h2>登场角色</h2>
          {characters.map((character) => (
            <a
              className="character-mini"
              href={`#/characters/${character.slug}`}
              key={character.slug}
            >
              <SiteImage src={character.cover} presentation={character.coverPresentation} alt="" />
              <span>{character.title}</span>
            </a>
          ))}
        </aside>
      </section>
    </main>
  );
}
