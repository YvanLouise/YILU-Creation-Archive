import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Eye,
  Focus,
  Maximize,
  Menu,
  Minus,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  Plus,
  Settings,
  Sun,
} from "lucide-react";
import { MarkdownView } from "../../features/markdown/MarkdownView.jsx";
import { useReadingPosition } from "../../features/reader/useReadingPosition.js";
import { BookmarkButton } from "../interaction/BookmarkButton.jsx";
import { entityKey } from "../interaction/domain.js";
import {
  chapterHref,
  chapterWordCount,
  normalizeChapterStructureConfig,
  normalizeSections,
  publicChapterBody,
  sectionAnchor,
} from "../../content-system/model/novelStructure.js";

const defaultSettings = {
  theme: "day",
  fontScale: 100,
  lineHeight: "comfortable",
  paragraphSpacing: "comfortable",
  contentWidth: 760,
};

function readSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem("ilu-reader-settings") || "{}") };
  } catch {
    return defaultSettings;
  }
}

function wordCount(source) {
  return String(source || "").replace(/[#>*_`[\]()!-]/g, "").replace(/\s+/g, "").length;
}

export function NovelReaderPage({ content, item, work }) {
  const chapters = useMemo(
    () => content.chapters
      .filter((chapter) => chapter.work === work.slug && chapter.status === "published")
      .sort((left, right) => left.order - right.order),
    [content.chapters, work.slug],
  );
  const currentIndex = chapters.findIndex((chapter) => chapter.slug === item.slug);
  const previous = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
  const structure = normalizeChapterStructureConfig(work.chapterStructure);
  const sections = useMemo(() => normalizeSections(item.sections), [item.sections]);
  const showSections = structure.enableSections && sections.length > 0;
  const renderedBody = showSections ? item.body : publicChapterBody(work, item);
  const totalWordCount = chapterWordCount(item);
  const [settings, setSettings] = useState(readSettings);
  const [leftOpen, setLeftOpen] = useState(() => typeof window !== "undefined" && window.innerWidth > 900);
  const [rightOpen, setRightOpen] = useState(() => typeof window !== "undefined" && window.innerWidth > 900);
  const [progress, setProgress] = useState(0);
  const { restoring, rootRef } = useReadingPosition(work.slug, item.slug);

  useEffect(() => {
    localStorage.setItem("ilu-reader-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const updateProgress = () => {
      const maximum = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(maximum > 0 ? Math.min(100, Math.round((window.scrollY / maximum) * 100)) : 100);
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    return () => window.removeEventListener("scroll", updateProgress);
  }, [item.slug]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === "ArrowLeft" && previous) window.location.hash = `/works/${work.slug}/chapters/${previous.slug}`;
      if (event.key === "ArrowRight" && next) window.location.hash = `/works/${work.slug}/chapters/${next.slug}`;
      if (event.key.toLowerCase() === "m") setLeftOpen((value) => !value);
      if (event.key.toLowerCase() === "s") setRightOpen((value) => !value);
      if (event.key.toLowerCase() === "d") setSettings((current) => ({ ...current, theme: current.theme === "night" ? "day" : "night" }));
      if (event.key.toLowerCase() === "f") {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, previous, work.slug]);

  const updateSetting = (patch) => setSettings((current) => ({ ...current, ...patch }));
  const toggleLeftPanel = () => {
    setLeftOpen((value) => {
      if (!value && window.innerWidth <= 900) setRightOpen(false);
      return !value;
    });
  };
  const toggleRightPanel = () => {
    setRightOpen((value) => {
      if (!value && window.innerWidth <= 900) setLeftOpen(false);
      return !value;
    });
  };
  const closeMobilePanels = () => {
    if (window.innerWidth <= 900) {
      setLeftOpen(false);
      setRightOpen(false);
    }
  };
  const readerStyle = {
    "--reader-font-scale": `${settings.fontScale}%`,
    "--reader-content-width": `${settings.contentWidth}px`,
  };

  return (
    <main ref={rootRef} className={`novel-reader theme-${settings.theme}${leftOpen ? " left-open" : ""}${rightOpen ? " right-open" : ""}${restoring ? " reading-position-restoring" : ""}`} style={readerStyle}>
      <div className={leftOpen || rightOpen ? "reader-mobile-scrim visible" : "reader-mobile-scrim"} onClick={closeMobilePanels} aria-hidden="true" />

      <aside className="reader-toc-panel" aria-label="章节目录">
        <div className="reader-panel-top">
          <a href={`#/works/${work.slug}`}><ArrowLeft size={15} />返回作品页</a>
          <button type="button" onClick={() => setLeftOpen(false)} aria-label="收起目录"><PanelLeftClose size={17} /></button>
        </div>
        <header>
          <span>目录</span><Menu size={16} />
          <h2>{work.title}</h2>
          <p>{work.subtitle || work.status}</p>
        </header>
        <nav>
          {chapters.map((chapter, index) => (
            <a className={chapter.slug === item.slug ? "active" : ""} href={`#/works/${work.slug}/chapters/${chapter.slug}`} onClick={closeMobilePanels} key={chapter.slug}>
              <span>第 {index + 1} 章 · {chapter.title}</span>
              <small>{chapter.status === "published" ? "已发布" : "草稿"}</small>
            </a>
          ))}
        </nav>
        {showSections ? (
          <nav className="reader-section-nav" aria-label="小节导航">
            <strong>小节导航</strong>
            {sections.map((section, index) => (
              <a href={chapterHref(work.slug, item.slug, sectionAnchor(section, index))} onClick={closeMobilePanels} key={section.id}>
                {section.title}
              </a>
            ))}
          </nav>
        ) : null}
        <div className="reader-progress-card">
          <span>阅读进度</span>
          <strong>已读到第 {Math.max(1, currentIndex + 1)} 章</strong>
          <div><i style={{ width: `${Math.max(progress, ((currentIndex + 1) / Math.max(chapters.length, 1)) * 100)}%` }} /></div>
          <small>{progress}% 本章进度</small>
        </div>
      </aside>

      {!leftOpen ? <button className="reader-panel-toggle left" type="button" onClick={toggleLeftPanel} aria-label="展开目录" aria-expanded="false"><PanelLeftOpen size={18} /><span>目录</span></button> : null}

      <article className="reader-document">
        <div className="reader-document-toolbar">
          <div>
            <a href={`#/works/${work.slug}`}>{work.title}</a>
            <ChevronRight size={12} />
            <span>第 {currentIndex + 1} 章</span>
            <ChevronRight size={12} />
            <strong>{item.title}</strong>
          </div>
          <div>
            <button type="button" onClick={toggleLeftPanel} aria-expanded={leftOpen}><Menu size={15} />目录</button>
            <BookmarkButton entityKey={entityKey("chapter", item.slug, work.slug)} compact />
            <button type="button" onClick={toggleRightPanel} aria-label="阅读设置" aria-expanded={rightOpen}><Settings size={17} /></button>
          </div>
        </div>

        <div className={`reader-paper line-${settings.lineHeight} spacing-${settings.paragraphSpacing}`}>
          <header>
            <span>第 {currentIndex + 1} 章</span>
            <h1>{item.title}</h1>
            {item.summary ? <p>{item.summary}</p> : null}
            <div><time><CalendarDays size={14} />{item.date} 发布</time><i />本章字数：{totalWordCount.toLocaleString()}</div>
          </header>
          <MarkdownView source={renderedBody} />
          {showSections ? sections.map((section, index) => (
            <section className="reader-section" id={sectionAnchor(section, index)} key={section.id}>
              <h2>{section.title}</h2>
              <MarkdownView source={section.body} />
            </section>
          )) : null}
          <nav className="reader-chapter-navigation">
            {previous ? <a href={`#/works/${work.slug}/chapters/${previous.slug}`}><ArrowLeft size={16} /><span><small>上一章</small>{previous.title}</span></a> : <span />}
            <button type="button" onClick={() => setLeftOpen(true)}><Menu size={16} />目录</button>
            {next ? <a className="next" href={`#/works/${work.slug}/chapters/${next.slug}`}><span><small>下一章</small>{next.title}</span><ArrowRight size={16} /></a> : <span />}
          </nav>
        </div>
      </article>

      {!rightOpen ? <button className="reader-panel-toggle right" type="button" onClick={toggleRightPanel} aria-label="展开阅读设置" aria-expanded="false"><Settings size={18} /><span>设置</span></button> : null}

      <aside className="reader-settings-panel" aria-label="阅读设置">
        <div className="reader-panel-top">
          <strong>阅读设置</strong>
          <button type="button" onClick={() => setRightOpen(false)} aria-label="收起设置"><PanelRightClose size={17} /></button>
        </div>

        <section>
          <h3>主题模式</h3>
          <div className="reader-theme-options">
            <button className={settings.theme === "day" ? "active" : ""} type="button" onClick={() => updateSetting({ theme: "day" })}><Sun size={15} />日间</button>
            <button className={settings.theme === "night" ? "active" : ""} type="button" onClick={() => updateSetting({ theme: "night" })}><Moon size={15} />夜间</button>
            <button className={settings.theme === "eye" ? "active" : ""} type="button" onClick={() => updateSetting({ theme: "eye" })}><Eye size={15} />护眼</button>
            <button className={settings.theme === "paper" ? "active" : ""} type="button" onClick={() => updateSetting({ theme: "paper" })}><BookOpen size={15} />纸书</button>
          </div>
        </section>

        <section>
          <h3>字体设置</h3>
          <div className="reader-font-control">
            <button type="button" onClick={() => updateSetting({ fontScale: Math.max(85, settings.fontScale - 5) })}><Minus size={14} /></button>
            <span>A　{settings.fontScale}%</span>
            <button type="button" onClick={() => updateSetting({ fontScale: Math.min(130, settings.fontScale + 5) })}><Plus size={14} /></button>
          </div>
          <label>字体<select><option>思源宋体</option><option>系统宋体</option></select></label>
          <span className="reader-setting-label">行距</span>
          <div className="reader-three-options">
            {["compact", "comfortable", "airy"].map((value, index) => <button className={settings.lineHeight === value ? "active" : ""} type="button" onClick={() => updateSetting({ lineHeight: value })} key={value}>{["紧", "适", "宽"][index]}</button>)}
          </div>
          <span className="reader-setting-label">段落间距</span>
          <div className="reader-three-options">
            {["compact", "comfortable", "airy"].map((value, index) => <button className={settings.paragraphSpacing === value ? "active" : ""} type="button" onClick={() => updateSetting({ paragraphSpacing: value })} key={value}>{["紧", "适", "宽"][index]}</button>)}
          </div>
        </section>

        <section>
          <h3>页面设置</h3>
          <label>内容宽度<input type="range" min="580" max="920" step="20" value={settings.contentWidth} onChange={(event) => updateSetting({ contentWidth: Number(event.target.value) })} /><span>{settings.contentWidth}px</span></label>
        </section>

        <section>
          <h3>其他</h3>
          <button className="reader-fullscreen" type="button" onClick={() => document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.()}><Maximize size={15} />全屏模式</button>
        </section>

        <section className="reader-shortcuts">
          <h3>快捷键</h3>
          <p><span>← / →</span>切换章节</p>
          <p><span>M</span>目录</p>
          <p><span>D</span>夜间模式</p>
          <p><span>F</span>全屏</p>
          <p><span>S</span>设置</p>
        </section>
        <div className="reader-settings-decoration"><Focus size={42} /><Check size={18} /></div>
      </aside>
    </main>
  );
}
