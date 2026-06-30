import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Compass, Feather, Image as ImageIcon, Sparkles } from "lucide-react";
import { normalizeAssetPath } from "../../content-system/model/assetPaths.js";
import { ProtectedImage } from "../../site/interaction/ProtectedImage.jsx";
import { BookmarkButton } from "../../site/interaction/BookmarkButton.jsx";
import { usePublicExperience } from "../../site/interaction/PublicExperience.jsx";
import { entityKey, normalizeLightboxItems } from "../../site/interaction/domain.js";
import {
  illustrationQueryHref,
  illustrationSortModes,
  resolveIllustrationsView,
} from "./domain.js";

function lightboxItem(item) {
  return {
    src: normalizeAssetPath(item.image),
    alt: item.title,
    caption: item.series ? `${item.title} · ${item.series}` : item.title,
  };
}

function IllustrationCard({ item, group, index }) {
  const { openLightbox } = usePublicExperience();
  const open = (event) => openLightbox(group, index, event.currentTarget);
  return (
    <article className="illustration-card">
      <button className="illustration-card-image" type="button" onClick={open}>
        <ProtectedImage
          src={item.image}
          alt={item.title}
          caption={item.title}
          items={group}
          index={index}
          showLightboxButton={false}
        />
      </button>
      <div className="illustration-card-body">
        <div>
          <h2>{item.title}</h2>
          <span>{item.category}</span>
        </div>
        <p>系列：{item.series || "未归档"}</p>
        <div className="illustration-card-actions">
          <button type="button" onClick={open}>查看详情 <ChevronRight size={14} /></button>
          <BookmarkButton entityKey={entityKey("illustration", item.slug)} compact />
        </div>
      </div>
    </article>
  );
}

export function IllustrationsPage({ content, queryString }) {
  const { openLightbox } = usePublicExperience();
  const initialView = useMemo(
    () => resolveIllustrationsView(content, queryString),
    [content, queryString],
  );
  const [localQuery, setLocalQuery] = useState(() => ({
    category: initialView.category,
    sort: initialView.sort,
  }));
  useEffect(() => {
    setLocalQuery({
      category: initialView.category,
      sort: initialView.sort,
    });
  }, [initialView.category, initialView.sort]);
  const view = useMemo(
    () => resolveIllustrationsView(
      content,
      illustrationQueryHref(localQuery).replace(/^#\/illustrations\??/, ""),
    ),
    [content, localQuery],
  );
  const group = useMemo(
    () => normalizeLightboxItems(view.items.map(lightboxItem)),
    [view.items],
  );
  const featuredItems = view.featuredItems || [];
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [featuredRatio, setFeaturedRatio] = useState(16 / 9);
  const [loadedFeaturedKey, setLoadedFeaturedKey] = useState("");
  const featured = featuredItems[featuredIndex] || featuredItems[0] || null;
  const featuredKey = featured?.slug || "";
  const featuredGroup = useMemo(
    () => normalizeLightboxItems(featuredItems.map(lightboxItem)),
    [featuredItems],
  );

  useEffect(() => {
    setFeaturedIndex(0);
  }, [featuredItems.map((item) => item.slug).join("|")]);

  useEffect(() => {
    if (!featuredItems.length || featuredIndex < featuredItems.length) return;
    setFeaturedIndex(0);
  }, [featuredIndex, featuredItems.length]);

  useEffect(() => {
    if (featuredItems.length < 2 || loadedFeaturedKey !== featuredKey) return undefined;
    const timer = window.setTimeout(() => {
      setFeaturedIndex((current) => (current + 1) % featuredItems.length);
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [featuredItems.length, featuredKey, loadedFeaturedKey]);

  useEffect(() => {
    if (!featured?.image) return undefined;
    let cancelled = false;
    setLoadedFeaturedKey("");
    const image = new Image();
    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // A loaded image can still be displayed even if explicit decode rejects.
      }
      if (cancelled || !image.naturalWidth || !image.naturalHeight) return;
      const ratio = image.naturalWidth / image.naturalHeight;
      setFeaturedRatio(Math.max(1.05, Math.min(2.6, ratio)));
      setLoadedFeaturedKey(featuredKey);
    };
    image.onerror = () => {
      if (!cancelled) setLoadedFeaturedKey("");
    };
    image.src = normalizeAssetPath(featured.image);
    return () => {
      cancelled = true;
    };
  }, [featured?.image, featuredKey]);

  useEffect(() => {
    if (featuredItems.length < 2) return undefined;
    const next = featuredItems[(featuredIndex + 1) % featuredItems.length];
    if (!next?.image) return undefined;
    const image = new Image();
    image.decoding = "async";
    image.src = normalizeAssetPath(next.image);
    return undefined;
  }, [featuredIndex, featuredItems]);

  const moveFeatured = (direction) => {
    if (featuredItems.length < 2) return;
    setFeaturedIndex((current) => (current + direction + featuredItems.length) % featuredItems.length);
  };

  const updateView = (patch) => {
    const next = {
      category: patch.category ?? view.category,
      sort: patch.sort ?? view.sort,
    };
    setLocalQuery(next);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${illustrationQueryHref(next)}`,
    );
  };

  const updateSort = (event) => {
    updateView({ sort: event.target.value });
  };

  return (
    <main className="illustrations-page">
      <section className="illustration-hero">
        <div className="section-shell illustration-hero-grid">
          <div className="illustration-hero-copy">
            <span className="section-label"><Sparkles size={15} /> 插画档案</span>
            <h1>插画收藏</h1>
            <p>
              每一幅画，都是故事的碎片与世界的回声。在这里，收集那些触动心弦的场景、角色与瞬间，
              让灵感在色彩与光影中被铭记。
            </p>
            <div className="illustration-hero-actions">
              <a className="primary-link" href="#/illustrations#illustration-grid">浏览全部 <BookOpen size={16} /></a>
              <a className="secondary-link" href={illustrationQueryHref({ category: "场景", sort: view.sort })}>按系列查看 <ChevronRight size={16} /></a>
            </div>
          </div>
          {featured ? (
            <div className="illustration-featured-shell" style={{ "--featured-ratio": featuredRatio }}>
              {featuredItems.length > 1 ? (
                <button
                  className="illustration-featured-nav previous"
                  type="button"
                  aria-label="上一张精选插画"
                  onClick={() => moveFeatured(-1)}
                >
                  <ChevronLeft size={22} />
                </button>
              ) : null}
              <button
                className="illustration-featured"
                type="button"
                onClick={(event) => openLightbox(featuredGroup, featuredIndex, event.currentTarget)}
                key={featured.slug}
              >
                <ProtectedImage
                  wrapperClassName="illustration-featured-backdrop"
                  src={featured.image}
                  alt=""
                  caption=""
                  showLightboxButton={false}
                  progressive={false}
                />
                <ProtectedImage
                  wrapperClassName="illustration-featured-main"
                  src={featured.image}
                  alt={featured.title}
                  caption={featured.title}
                  items={featuredGroup}
                  index={featuredIndex}
                  showLightboxButton={false}
                  priority
                />
                <span>
                  <strong>{featured.title}</strong>
                  <small>{featured.summary}</small>
                </span>
              </button>
              {featuredItems.length > 1 ? (
                <>
                  <button
                    className="illustration-featured-nav next"
                    type="button"
                    aria-label="下一张精选插画"
                    onClick={() => moveFeatured(1)}
                  >
                    <ChevronRight size={22} />
                  </button>
                  <div className="illustration-featured-dots" aria-label="精选插画进度">
                    {featuredItems.map((item, index) => (
                      <button
                        type="button"
                        className={index === featuredIndex ? "active" : ""}
                        aria-label={`切换到精选插画 ${index + 1}`}
                        onClick={() => setFeaturedIndex(index)}
                        key={item.slug}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="illustration-featured empty">
              <ImageIcon size={28} />
              <span><strong>暂无公开插画</strong><small>在管理端发布第一张插画后，这里会自动展示。</small></span>
            </div>
          )}
        </div>
      </section>

      <section className="section-shell illustration-browser" id="illustration-grid">
        <div className="illustration-filter-bar">
          <div className="illustration-tabs" role="tablist" aria-label="插画分类">
            <button
              type="button"
              className={view.category === "all" ? "active" : ""}
              onClick={() => updateView({ category: "all" })}
            >
              全部
            </button>
            {view.categories.map((category) => (
              <button
                type="button"
                className={view.category === category ? "active" : ""}
                onClick={() => updateView({ category })}
                key={category}
              >
                {category}
              </button>
            ))}
          </div>
          <label className="illustration-sort">
            <span>排序</span>
            <select value={view.sort} onChange={updateSort}>
              {illustrationSortModes.map((mode) => <option value={mode.id} key={mode.id}>{mode.label}</option>)}
            </select>
          </label>
        </div>

        <div className="illustration-layout">
          <div className="illustration-grid">
            {view.items.map((item, index) => (
              <IllustrationCard item={item} group={group} index={index} key={item.slug} />
            ))}
            {!view.items.length ? (
              <div className="illustration-empty">
                <ImageIcon size={26} />
                <h2>这一类还没有公开插画</h2>
                <p>换一个分类，或在管理端把插画状态切换为已发布。</p>
              </div>
            ) : null}
          </div>

          <aside className="illustration-sidebar">
            <article>
              <Feather size={22} />
              <h2>插画说明</h2>
              <p>这里收录番外制作的插画作品，包括角色、场景、封面与过程稿。每一幅画都来自不同的故事与灵感瞬间。</p>
            </article>
            <article>
              <Compass size={22} />
              <h2>归档方式</h2>
              <ul>
                <li>按角色、故事、场景与气氛归档</li>
                <li>按创作阶段区分草图、过程稿与成稿</li>
                <li>支持按系列与类型筛选</li>
              </ul>
            </article>
            <blockquote>
              插画并非故事的终点，而是通往想象的另一扇门。
            </blockquote>
          </aside>
        </div>

        {view.items.length ? (
          <div className="illustration-strip">
            <div>
              <strong>本月整理 · 夜色书信 · 系列精选</strong>
              <p>记录在夜晚留给星空的信号与回声，愿这些画面能照亮故事边角。</p>
            </div>
            {view.items.slice(0, 3).map((item, index) => (
              <button
                type="button"
                onClick={(event) => openLightbox(group, index, event.currentTarget)}
                key={item.slug}
              >
                <ProtectedImage src={item.image} alt={item.title} showLightboxButton={false} />
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
