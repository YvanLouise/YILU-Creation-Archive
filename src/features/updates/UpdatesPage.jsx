import React, { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { EmptyState } from "../../shared/components/EmptyState.jsx";
import {
  normalizeUpdatesType,
  resolveUpdates,
  visibleUpdatesPage,
} from "./domain.js";
import { UpdateRow } from "./UpdateRow.jsx";

export const updateFilters = [
  { id: "all", label: "全部" },
  { id: "work", label: "作品" },
  { id: "novelChapter", label: "小说章节" },
  { id: "comicEpisode", label: "漫画话数" },
  { id: "character", label: "角色" },
  { id: "illustration", label: "插画" },
  { id: "note", label: "创作笔记" },
];

export function UpdatesPage({ content, queryString }) {
  const params = new URLSearchParams(queryString);
  const type = normalizeUpdatesType(params.get("type") || "all");
  const [visibleCount, setVisibleCount] = useState(12);
  const updatesByType = useMemo(
    () => new Map(
      updateFilters.map((filter) => [
        filter.id,
        resolveUpdates(content, filter.id),
      ]),
    ),
    [content],
  );
  const updates = updatesByType.get(type) || [];
  const visiblePage = useMemo(
    () => visibleUpdatesPage(updates, visibleCount),
    [updates, visibleCount],
  );

  useEffect(() => {
    setVisibleCount(12);
  }, [type]);

  return (
    <main className="updates-page section-shell">
      <header className="archive-heading updates-heading">
        <div className="section-label"><span />Updates</div>
        <h1>最近更新</h1>
        <p>
          按{content.site.updatesSortMode === "createdAt" ? "首次公开时间" : "标注日期"}
          整理作品与创作记录。
        </p>
      </header>
      <div className="updates-filters" role="tablist" aria-label="更新类型">
        {updateFilters.map((filter) => (
          <a
            className={type === filter.id ? "active" : ""}
            href={`#/updates?type=${filter.id}`}
            role="tab"
            aria-selected={type === filter.id}
            key={filter.id}
          >
            {filter.label}<span>{updatesByType.get(filter.id)?.length || 0}</span>
          </a>
        ))}
      </div>
      {updates.length ? (
        <>
          <div className="updates-list updates-archive-list">
            {visiblePage.items.map((update) => (
              <UpdateRow
                update={update}
                sortMode={content.site.updatesSortMode}
                key={`${update.kind}-${update.slug}`}
              />
            ))}
          </div>
          {visiblePage.hasMore ? (
            <button
              className="updates-load-more"
              type="button"
              onClick={() => setVisibleCount(visiblePage.nextVisibleCount)}
            >
              加载更多
            </button>
          ) : null}
        </>
      ) : (
        <EmptyState
          className="updates-empty"
          icon={Sparkles}
          title="这里暂时没有更新"
          description="切换到其他类型，或稍后再来看看。"
        />
      )}
    </main>
  );
}
