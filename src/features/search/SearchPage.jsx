import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowRight, Search as SearchIcon, Sparkles, X } from "lucide-react";
import {
  buildSearchDocuments,
  extractSearchSnippet,
  highlightSearchText,
  searchDocuments,
} from "./domain.js";

export const searchTypes = [
  { id: "all", label: "全部" },
  { id: "work", label: "作品" },
  { id: "chapter", label: "章节" },
  { id: "character", label: "角色" },
  { id: "illustration", label: "插画" },
  { id: "note", label: "创作笔记" },
];

export function parseSearchQuery(queryString) {
  const params = new URLSearchParams(queryString);
  const requestedType = params.get("type") || "all";
  return {
    query: params.get("q") || "",
    type: searchTypes.some((item) => item.id === requestedType)
      ? requestedType
      : "all",
  };
}

function HighlightedText({ text, query }) {
  return highlightSearchText(text, query).map((part, index) =>
    part.match
      ? <mark key={`${part.text}-${index}`}>{part.text}</mark>
      : (
          <React.Fragment key={`${part.text}-${index}`}>
            {part.text}
          </React.Fragment>
        ),
  );
}

export function SearchPage({ content, queryString }) {
  const initial = useMemo(
    () => parseSearchQuery(queryString),
    [queryString],
  );
  const [query, setQuery] = useState(initial.query);
  const [type, setType] = useState(initial.type);
  const inputRef = useRef(null);
  const deferredQuery = useDeferredValue(query);
  const documents = useMemo(() => buildSearchDocuments(content), [content]);
  const allResults = useMemo(
    () => searchDocuments(documents, deferredQuery, "all"),
    [deferredQuery, documents],
  );
  const results = useMemo(
    () => searchDocuments(documents, deferredQuery, type),
    [deferredQuery, documents, type],
  );

  useEffect(() => {
    setQuery(initial.query);
    setType(initial.type);
  }, [initial]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (type !== "all") params.set("type", type);
      const nextHash = `/search${params.size ? `?${params}` : ""}`;
      if (window.location.hash.replace(/^#/, "") !== nextHash) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}#${nextHash}`,
        );
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query, type]);

  const counts = useMemo(() => {
    const next = {
      all: allResults.length,
      work: 0,
      chapter: 0,
      character: 0,
      illustration: 0,
      note: 0,
    };
    for (const result of allResults) next[result.kind] += 1;
    return next;
  }, [allResults]);

  return (
    <main className="search-page section-shell">
      <header className="search-heading">
        <div className="section-label"><span />Search</div>
        <h1>搜索档案馆</h1>
        <p>在作品、章节、角色与创作笔记中寻找名字、地点和故事片段。</p>
      </header>
      <form
        className="search-form"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <SearchIcon size={22} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="输入人物、地点、作品名或正文关键词"
          aria-label="搜索站内内容"
          autoComplete="off"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label="清空搜索">
            <X size={18} />
          </button>
        ) : null}
      </form>
      <div className="search-toolbar">
        <div className="search-filters" role="tablist" aria-label="搜索内容分类">
          {searchTypes.map((item) => (
            <button
              className={type === item.id ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={type === item.id}
              onClick={() => setType(item.id)}
              key={item.id}
            >
              {item.label}<span>{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <p>
          {deferredQuery.trim()
            ? `找到 ${results.length} 条结果`
            : `共收录 ${documents.length} 项公开内容`}
        </p>
      </div>

      {!deferredQuery.trim() ? (
        <section className="search-state">
          <SearchIcon size={30} />
          <h2>从一个关键词开始</h2>
          <p>例如“赛莉娅”“维斯塔”“月灯”或“地图”。</p>
        </section>
      ) : results.length ? (
        <div className="search-results">
          {results.map((result) => {
            const snippet = extractSearchSnippet(result, deferredQuery);
            return (
              <a
                className="search-result"
                href={result.href}
                key={`${result.kind}-${result.slug}`}
              >
                <div className="search-result-meta">
                  <span>{result.kindLabel}</span>
                  {result.workTitle ? <b>{result.workTitle}</b> : null}
                  {result.date
                    ? <time>{result.date.replaceAll("-", ".")}</time>
                    : null}
                </div>
                <h2>
                  <HighlightedText text={result.title} query={deferredQuery} />
                </h2>
                <p>
                  <HighlightedText text={snippet} query={deferredQuery} />
                </p>
                <i>查看内容 <ArrowRight size={16} /></i>
              </a>
            );
          })}
        </div>
      ) : (
        <section className="search-state search-empty">
          <Sparkles size={30} />
          <h2>没有找到相关内容</h2>
          <p>换一个更短的关键词，或切换到“全部”分类试试。</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setType("all");
            }}
          >
            清空搜索
          </button>
        </section>
      )}
    </main>
  );
}
