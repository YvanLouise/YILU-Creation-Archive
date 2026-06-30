import React, { useEffect, useId, useState } from "react";
import { ExternalLink, Feather, FolderHeart, Heart, Mail, Menu, Search, Tv, X } from "lucide-react";
import { usePublicExperience } from "../interaction/PublicExperience.jsx";

export const navItems = [
  { label: "首页", href: "#/" },
  { label: "作品", href: "#/works" },
  { label: "角色", href: "#/characters" },
  { label: "插画", href: "#/illustrations" },
  { label: "创作笔记", href: "#/notes" },
  { label: "关于我", href: "#/about" },
];

export function Brand({ site }) {
  return (
    <a className="brand" href="#/" aria-label="返回首页">
      <span className="brand-mark"><Feather size={19} /></span>
      <span>
        <strong>{site.brand.name}</strong>
        <small>{site.brand.subtitle}</small>
      </span>
    </a>
  );
}

export function Header({ site, route }) {
  const [open, setOpen] = useState(false);
  const navigationId = useId();
  const socialLinks = (site.socialLinks || []).filter((link) => link.enabled && link.url);
  const { openArchive, setNavigationOpen } = usePublicExperience();

  useEffect(() => {
    setOpen(false);
  }, [route]);

  useEffect(() => {
    setNavigationOpen(open);
  }, [open, setNavigationOpen]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <header className={open ? "site-header menu-open" : "site-header"}>
      <div className="header-inner">
        <Brand site={site} />
        <nav
          className={open ? "nav is-open" : "nav"}
          id={navigationId}
          aria-label="主导航"
        >
          <div className="nav-links">
            {navItems.map((item, index) => {
              const itemRoute = item.href.replace("#", "");
              const active = itemRoute === "/" ? route === "/" : route.startsWith(itemRoute);
              return (
                <a
                  className={active ? "active" : ""}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  key={item.href}
                  onClick={() => setOpen(false)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item.label}
                </a>
              );
            })}
          </div>
          <div className="mobile-nav-footer">
            <p>原创小说 · 漫画 · 世界与故事</p>
            <a href={`mailto:${site.brand.email}`}>
              <Mail size={16} />{site.brand.email}
            </a>
            <div>
              {socialLinks.map((link) => (
                <a href={link.url} target="_blank" rel="noreferrer" key={link.id}>
                  {link.label}<ExternalLink size={13} />
                </a>
              ))}
            </div>
            <button type="button" onClick={() => {
              setOpen(false);
              openArchive();
            }}>
              <FolderHeart size={16} />打开我的档案
            </button>
          </div>
        </nav>
        <div className="header-actions">
          <button
            className="icon-button archive-button"
            type="button"
            aria-label="打开我的档案"
            onClick={() => openArchive()}
          >
            <FolderHeart size={19} />
          </button>
          <a
            className={route === "/search" ? "icon-button active" : "icon-button"}
            href="#/search"
            aria-label="搜索"
            onClick={() => setOpen(false)}
          >
            <Search size={20} />
          </a>
          <button
            className="menu-button"
            type="button"
            aria-label={open ? "关闭导航" : "打开导航"}
            aria-expanded={open}
            aria-controls={navigationId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer({ site }) {
  const socialLinks = (site.socialLinks || []).filter((link) => link.enabled && link.url);
  const socialIcon = (id) => {
    if (id === "bilibili") return <Tv size={15} />;
    if (id === "afdian") return <Heart size={15} />;
    return <ExternalLink size={15} />;
  };
  return (
    <footer className="site-footer">
      <div className="section-shell footer-grid">
        <div>
          <Brand site={site} />
          <p>一个安静收录原创故事、角色与创作过程的小站。</p>
        </div>
        <div>
          <strong>站点</strong>
          {navItems.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
        </div>
        <div>
          <strong>联系</strong>
          <a className="footer-contact-link" href={`mailto:${site.brand.email}`}><Mail size={15} /><span>{site.brand.email}</span></a>
          {socialLinks.map((link) => (
            <a className="footer-contact-link" href={link.url} target="_blank" rel="noreferrer" key={link.id}>
              {socialIcon(link.id)}<span>{link.label}</span>
            </a>
          ))}
        </div>
      </div>
      <div className="section-shell copyright">
        © 2026 伊露创作档案馆。所有文字、角色、世界观与图片设定未经许可不得转载或商用。
      </div>
    </footer>
  );
}

export function PublicLayout({ site, route, children }) {
  const { hidePublicFooter, routeKey } = usePublicExperience();
  return (
    <>
      <Header site={site} route={route} />
      <div className="route-page-stage" key={routeKey}>{children}</div>
      {hidePublicFooter ? null : <Footer site={site} />}
    </>
  );
}
