import React from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { EmptyState } from "../../shared/components/EmptyState.jsx";
import {
  workCategoryFromQuery,
  workCategoryHref,
  workTypeFromQuery,
  workTypeHref,
} from "../interaction/filters.js";
import { workCategoriesForType } from "../../content-system/model/workCategories.js";
import { SiteImage } from "../interaction/SiteImage.jsx";

export function CollectionPage({ eyebrow, title, intro, items, kind, queryString = "", site = null }) {
  const visibleItems = items.filter(
    (item) => !item.hidden && item.status !== "draft",
  );
  const workType = workTypeFromQuery(queryString);
  const workCategories = kind === "work"
    ? workCategoriesForType(site?.workCategories, workType)
    : [];
  const workCategory = workCategoryFromQuery(queryString, workCategories);
  const workTypeItems = kind === "work"
    ? visibleItems.filter((item) => item.type === workType)
    : [];
  const displayedItems = kind === "work"
    ? workTypeItems.filter((item) =>
        workCategory === "all" || item.workCategory === workCategory,
      )
    : visibleItems;
  const activeCategory = workCategories.find((item) => item.id === workCategory);
  return (
    <main className="archive-page section-shell">
      <header className="archive-heading">
        <div className="section-label"><span />{eyebrow}</div>
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>
      {kind === "work" ? (
        <div className="work-filter-stack">
          <div className="work-type-tabs" role="tablist" aria-label="作品类型">
            {["小说", "漫画"].map((type) => (
              <a
                className={workType === type ? "active" : ""}
                role="tab"
                aria-selected={workType === type}
                href={workTypeHref(type)}
                key={type}
              >
                {type}
                <span>
                  {visibleItems.filter((item) => item.type === type).length}
                </span>
              </a>
            ))}
          </div>
          {workCategories.length ? (
            <div className="work-category-tabs" role="tablist" aria-label={`${workType}篇幅分类`}>
              <a
                className={workCategory === "all" ? "active" : ""}
                role="tab"
                aria-selected={workCategory === "all"}
                href={workCategoryHref(workType)}
              >
                全部 <span>{workTypeItems.length}</span>
              </a>
              {workCategories.map((category) => (
                <a
                  className={workCategory === category.id ? "active" : ""}
                  role="tab"
                  aria-selected={workCategory === category.id}
                  href={workCategoryHref(workType, category.id)}
                  key={category.id}
                >
                  {category.label}
                  <span>{workTypeItems.filter((item) => item.workCategory === category.id).length}</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="archive-grid">
        {displayedItems.map((item) => {
          const href =
            kind === "work"
              ? `#/works/${item.slug}`
              : kind === "character"
                ? `#/characters/${item.slug}`
                : `#/notes/${item.slug}`;
          return (
            <a className="archive-card" href={href} key={item.slug}>
              <SiteImage src={item.cover} alt="" wrapperClassName="archive-card-image" />
              <div>
                <span>{kind === "work" ? item.status : item.date}</span>
                <h2>{item.title}</h2>
                <p>{item.description || item.summary}</p>
                <i>查看内容 <ArrowRight size={15} /></i>
              </div>
            </a>
          );
        })}
        {!displayedItems.length ? (
          <EmptyState
            icon={BookOpen}
            title="这里还在慢慢准备"
            description={activeCategory
              ? `“${activeCategory.label}”分类下暂时没有公开的${workType}作品。`
              : `${workType}作品完成第一部分后，会在这里出现。`}
          />
        ) : null}
      </div>
    </main>
  );
}
