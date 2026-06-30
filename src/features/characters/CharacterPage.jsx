import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Feather,
  FolderOpen,
  Images,
  MoonStar,
  Quote,
  Sparkles,
} from "lucide-react";
import { getWork } from "../../content-system/query/selectors.js";
import { MarkdownView } from "../markdown/MarkdownView.jsx";
import {
  characterArchiveId,
  characterNeighbors,
  relatedCharacters,
} from "./domain.js";
import { BookmarkButton } from "../../site/interaction/BookmarkButton.jsx";
import { entityKey } from "../../site/interaction/domain.js";
import { ProtectedImage } from "../../site/interaction/ProtectedImage.jsx";
import { SiteImage } from "../../site/interaction/SiteImage.jsx";

function CharacterPortrait({ character }) {
  return character.cover
    ? <SiteImage src={character.cover} alt={`${character.title}角色肖像`} />
    : <span aria-hidden="true">{character.title.slice(0, 1)}</span>;
}

export function CharacterPage({ content, character }) {
  const work = getWork(content, character.work);
  const configuredRelationships = (character.relationships || [])
    .map((relationship) => {
      const target = content.characters.find((item) => item.slug === relationship.characterSlug);
      return target ? { ...relationship, target } : null;
    })
    .filter(Boolean);
  const related = relatedCharacters(content, character);
  const { previous, next } = characterNeighbors(content, character);
  const aliases = character.aliases || [];
  const traits = character.traits || [];
  const abilities = character.abilities || [];
  const timeline = character.timeline || [];
  const gallery = character.gallery || [];
  const galleryImages = gallery.map((image, index) => ({
    src: image.image,
    alt: `${character.title}${image.label || "设定图"}`,
    caption: image.label || `档案影像 ${index + 1}`,
  }));
  const portraitImages = character.cover
    ? [{ src: character.cover, alt: `${character.title}角色肖像`, caption: `${characterArchiveId(character)} · 人物肖像记录` }]
    : [];
  const details = [
    ["档案编号", characterArchiveId(character)],
    ["身份", character.role],
    ["所属", character.affiliation],
    ["状态", character.profileStatus],
    ["别名", aliases.join(" · ")],
    ["归档日期", character.date],
  ].filter(([, value]) => value);

  return (
    <main className="character-dossier-page">
      <div className="section-shell character-dossier-nav">
        <a href="#/characters"><ArrowLeft size={15} />返回角色档案</a>
        <div>
          <BookmarkButton entityKey={entityKey("character", character.slug)} compact />
          {previous ? (
            <a href={`#/characters/${previous.slug}`}>
              <ArrowLeft size={14} />上一位
            </a>
          ) : <span />}
          {next ? (
            <a href={`#/characters/${next.slug}`}>
              下一位<ArrowRight size={14} />
            </a>
          ) : null}
        </div>
      </div>

      <section className="section-shell character-dossier-hero">
        <figure className="character-dossier-portrait">
          {character.cover ? (
            <ProtectedImage
              src={character.cover}
              alt={`${character.title}角色肖像`}
              caption={`${characterArchiveId(character)} · 人物肖像记录`}
              items={portraitImages}
            />
          ) : <CharacterPortrait character={character} />}
          <figcaption>{characterArchiveId(character)} · 人物肖像记录</figcaption>
        </figure>

        <div className="character-dossier-summary">
          <div className="character-dossier-title">
            <div>
              <div className="section-label"><span />{character.role || "Character file"}</div>
              <h1>{character.title}</h1>
              {aliases.length ? <em>{aliases.join(" / ")}</em> : null}
            </div>
            <MoonStar aria-hidden="true" />
          </div>

          {character.summary ? (
            <blockquote>
              <Quote size={22} />
              <p>{character.summary}</p>
            </blockquote>
          ) : null}

          <dl className="character-dossier-facts">
            {details.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>

          {traits.length ? (
            <div className="character-traits" aria-label="角色关键词">
              {traits.map((trait) => <span key={trait}>{trait}</span>)}
            </div>
          ) : null}

          {work ? (
            <a className="character-work-link" href={`#/works/${work.slug}`}>
              <BookOpen size={15} />
              <span><small>所属作品</small>{work.title}</span>
              <ArrowRight size={15} />
            </a>
          ) : null}
        </div>
      </section>

      <section className="character-dossier-content">
        <div className="section-shell character-dossier-grid">
          <div className="character-dossier-column">
            <article className="character-record-panel">
              <header>
                <div>
                  <span>Archive record</span>
                  <h2>人物记录</h2>
                </div>
                <Feather size={22} />
              </header>
              <MarkdownView source={character.body} />
            </article>

            <aside className="character-related-panel">
              <header>
                <div>
                  <span>Related files</span>
                  <h2>人物关系</h2>
                </div>
                <FolderOpen size={20} />
              </header>
              {configuredRelationships.length
                ? configuredRelationships.map(({ target, label, description }) => (
                  <a href={`#/characters/${target.slug}`} key={target.slug}>
                    <div className="character-related-portrait">
                      <CharacterPortrait character={target} />
                    </div>
                    <div>
                      <strong>{target.title}{label ? <small>{label}</small> : null}</strong>
                      <span>{description || target.role || target.summary}</span>
                    </div>
                    <ArrowRight size={15} />
                  </a>
                ))
                : related.length ? related.map((item) => (
                  <a href={`#/characters/${item.slug}`} key={item.slug}>
                    <div className="character-related-portrait">
                      <CharacterPortrait character={item} />
                    </div>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.role || item.summary}</span>
                    </div>
                    <ArrowRight size={15} />
                  </a>
                )) : <p>这份卷宗暂时只收录了这一位角色。</p>}
              {work ? (
                <a className="character-related-work" href={`#/works/${work.slug}`}>
                  <FolderOpen size={15} />查阅《{work.title}》完整卷宗
                </a>
              ) : null}
            </aside>
          </div>

          <div className="character-dossier-column">
            {abilities.length ? (
              <section className="character-abilities-panel">
                <header>
                  <div><span>Abilities</span><h2>能力与特长</h2></div>
                  <Sparkles size={20} />
                </header>
                <div className="character-ability-list">
                  {abilities.map((ability, index) => (
                    <article key={`${ability.name}-${index}`}>
                      <div className="character-ability-icon">
                        {ability.image ? <SiteImage src={ability.image} alt="" /> : <Sparkles size={18} />}
                      </div>
                      <div><h3>{ability.name}</h3><p>{ability.description}</p></div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {timeline.length ? (
              <section className="character-timeline-panel">
                <header>
                  <div><span>Timeline</span><h2>角色时间线</h2></div>
                  <CalendarDays size={20} />
                </header>
                <ol>
                  {timeline.map((event, index) => (
                    <li key={`${event.label}-${index}`}>
                      <strong>{event.label}</strong>
                      <p>{event.description}</p>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
        </div>
      </section>

      {gallery.length ? (
        <section className="section-shell character-gallery-section">
          <header>
            <div><span>Visual records</span><h2>形象与设定</h2></div>
            <Images size={21} />
          </header>
          <div className="character-gallery-track">
            {gallery.map((image, index) => (
              <figure key={`${image.label}-${index}`}>
                <ProtectedImage
                  src={image.image}
                  alt={`${character.title}${image.label || "设定图"}`}
                  caption={image.label || `档案影像 ${index + 1}`}
                  items={galleryImages}
                  index={index}
                />
                <figcaption>{image.label || `档案影像 ${index + 1}`}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <div className="section-shell character-dossier-note">
        <CalendarDays size={16} />
        角色档案会随故事进展持续补充，当前记录更新于 {character.date}。
      </div>
    </main>
  );
}
