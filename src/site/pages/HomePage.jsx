import React from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { getWork } from "../../content-system/query/selectors.js";
import { resolveHomeStats } from "../../features/home/stats.js";
import { noteCategory, noteTags, resolveHomeNotes } from "../../features/notes/domain.js";
import { resolveHomeUpdates } from "../../features/updates/domain.js";
import { UpdateRow } from "../../features/updates/UpdateRow.jsx";
import { ButtonLink } from "../../shared/components/ButtonLink.jsx";
import { SiteImage } from "../interaction/SiteImage.jsx";

export function HomePage({ content }) {
  const { site } = content;
  const work = getWork(content, site.featuredWorkSlug);
  const updates = resolveHomeUpdates(content);
  const notes = resolveHomeNotes(content, 2);
  const stats = resolveHomeStats(content);
  return (
    <main>
      <section className="hero section-shell">
        <div className="hero-copy">
          <div className="section-label"><span />主推{work.type}</div>
          <h1>{work.title}</h1>
          <p className="hero-subtitle">{work.subtitle}</p>
          <p className="hero-description">{work.description}</p>
          <div className="button-row">
            <ButtonLink href={`#/works/${work.slug}`}>
              <BookOpen size={18} />开始阅读
            </ButtonLink>
            <ButtonLink
              href={`#/works/${work.slug}#settings`}
              variant="secondary"
            >
              查看设定
            </ButtonLink>
          </div>
          <dl className="work-meta">
            <div><dt>当前进度</dt><dd>{work.progress}</dd></div>
            <div><dt>类型</dt><dd>{work.genre.join(" · ")}</dd></div>
            <div><dt>更新状态</dt><dd>{work.status}</dd></div>
          </dl>
        </div>
        <div className="hero-visual">
          <SiteImage src={work.cover} presentation={work.coverPresentation} alt={`${work.title}主视觉`} priority />
          <div className="cover-caption">
            <span>ILU ORIGINAL STORY</span>
            <strong>愿每一盏微光，都能照见被遗忘的名字。</strong>
          </div>
        </div>
      </section>

      <section className="author-band">
        <div className="section-shell author-layout">
          <div className="author-intro">
            <SiteImage src={site.author.avatar} presentation={site.author.avatarPresentation} alt="伊露的插画头像" />
            <div>
              <div className="section-label"><span />关于创作者</div>
              <h2>你好，我是{site.author.name}</h2>
              <p>{site.author.intro}</p>
              <div className="text-links">
                <a href="#/about">了解我 <ArrowRight size={15} /></a>
                <a href="#/notes">查看创作笔记 <ArrowRight size={15} /></a>
              </div>
            </div>
          </div>
          <div className="stats" aria-label="创作统计">
            {stats.map((stat) => (
              <div className="stat" key={stat.label}>
                <strong>{stat.value}</strong><span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="updates-section section-shell">
        <div className="section-heading">
          <div>
            <div className="section-label"><span />Latest</div>
            <h2>最近更新</h2>
          </div>
          <a href="#/updates?type=all">
            查看全部 <ArrowRight size={16} />
          </a>
        </div>
        <div className="updates-list">
          {updates.map((update) => (
            <UpdateRow
              update={update}
              sortMode={site.updatesSortMode}
              key={`${update.kind}-${update.slug}`}
            />
          ))}
        </div>
      </section>

      {site.showWorkbench !== false ? (
        <section className="workbench-section">
          <div className="section-shell">
            <div className="section-heading">
              <div>
                <div className="section-label"><span />In progress</div>
                <h2>创作中的角落</h2>
              </div>
              <p>一些还没有完成，但值得被记住的片段。</p>
            </div>
            <div className="workbench-grid">
              <a
                className="workbench-item sketch-item"
                href="#/characters/celia"
              >
                <SiteImage src="./assets/ilu-avatar.png" alt="赛莉娅角色草图预览" />
                <div>
                  <span>角色草图 · 进行中</span>
                  <h3>赛莉娅的旅行服</h3>
                </div>
                <ArrowRight size={19} />
              </a>
              {notes.map((note) => (
                <a
                  className="workbench-item note-item"
                  href={`#/notes/${note.slug}`}
                  key={note.slug}
                >
                  <div className="note-paper" aria-hidden="true">
                    <span>{noteCategory(note)}</span>
                    <i>{noteTags(note).slice(0, 3).join(" / ") || note.date}</i>
                    <b>{note.summary || "记录一个还在生长的想法。"}</b>
                  </div>
                  <div>
                    <span>{note.pinned ? "置顶笔记" : "创作笔记"} · {note.date}</span>
                    <h3>{note.title}</h3>
                  </div>
                  <ArrowRight size={19} />
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
