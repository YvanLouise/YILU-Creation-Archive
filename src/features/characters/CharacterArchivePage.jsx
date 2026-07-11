import React, { useMemo } from "react";
import { ArrowRight, FolderOpen, UserRound } from "lucide-react";
import { EmptyState } from "../../shared/components/EmptyState.jsx";
import { characterArchiveId, characterGroups } from "./domain.js";
import {
  characterCategoryFromQuery,
  characterCategoryHref,
} from "../../site/interaction/filters.js";
import { SiteImage } from "../../site/interaction/SiteImage.jsx";

function CharacterPortrait({ character }) {
  return character.cover
    ? <SiteImage src={character.cover} presentation={character.coverPresentation} alt={`${character.title}角色肖像`} />
    : <span aria-hidden="true">{character.title.slice(0, 1)}</span>;
}

export function CharacterArchivePage({ content, queryString = "" }) {
  const groups = characterGroups(content);
  const categories = useMemo(() => {
    const typeCategories = ["小说", "漫画"]
      .map((type) => ({
        id: `type:${type}`,
        label: `${type}角色`,
        count: groups.filter((group) => group.work.type === type)
          .reduce((total, group) => total + group.characters.length, 0),
      }))
      .filter((item) => item.count);
    return [
      { id: "all", label: "全部角色", count: groups.reduce((total, group) => total + group.characters.length, 0) },
      ...typeCategories,
      ...groups.map((group) => ({ id: `work:${group.work.slug}`, label: group.work.title, count: group.characters.length })),
    ];
  }, [groups]);
  const category = characterCategoryFromQuery(queryString, categories);
  const visibleGroups = groups.filter((group) =>
    category === "all" ||
    category === `type:${group.work.type}` ||
    category === `work:${group.work.slug}`);

  return (
    <main className="character-archive-page section-shell">
      <header className="character-archive-heading">
        <div className="section-label"><span />Character files</div>
        <h1>角色档案</h1>
        <p>按故事卷宗收录人物记录。姓名之外，还有他们在世界中留下的身份、关系与痕迹。</p>
      </header>

      {groups.length ? (
        <nav className="character-category-filter" aria-label="角色分类">
          {categories.map((item) => (
            <a
              className={category === item.id ? "active" : ""}
              aria-pressed={category === item.id}
              href={characterCategoryHref(item.id)}
              key={item.id}
            >
              <span>{item.label}</span><b>{item.count}</b>
            </a>
          ))}
        </nav>
      ) : null}

      {visibleGroups.map(({ work, characters }) => (
        <section className="character-file-group" key={work.slug}>
          <header>
            <div>
              <span>所属卷宗</span>
              <h2>{work.title}</h2>
              <p>{work.subtitle || work.description}</p>
            </div>
            {work.isUnassigned ? null : (
              <a href={`#/works/${work.slug}`}>
              <FolderOpen size={15} />查看作品
              </a>
            )}
          </header>
          <div className="character-file-grid">
            {characters.map((character) => (
              <a
                className="character-file-card"
                href={`#/characters/${character.slug}`}
                key={character.slug}
              >
                <div className="character-file-portrait">
                  <CharacterPortrait character={character} />
                  <b>{characterArchiveId(character)}</b>
                </div>
                <div className="character-file-copy">
                  <span>{character.role || "人物记录"}</span>
                  <h3>{character.title}</h3>
                  <p>{character.summary}</p>
                  <dl>
                    {character.affiliation ? (
                      <div><dt>所属</dt><dd>{character.affiliation}</dd></div>
                    ) : null}
                    {character.profileStatus ? (
                      <div><dt>状态</dt><dd>{character.profileStatus}</dd></div>
                    ) : null}
                  </dl>
                  <i>查阅档案 <ArrowRight size={15} /></i>
                </div>
              </a>
            ))}
          </div>
        </section>
      ))}

      {!groups.length ? (
        <EmptyState
          icon={UserRound}
          title="档案柜仍是空的"
          description="公开角色完成第一份人物记录后，会按所属作品收录在这里。"
        />
      ) : null}

      {groups.length && !visibleGroups.length ? (
        <EmptyState
          icon={UserRound}
          title="这个分类暂无角色"
          description="切换其他分类查看已经公开的人物档案。"
        />
      ) : null}
    </main>
  );
}
