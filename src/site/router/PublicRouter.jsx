import React from "react";
import {
  getItem,
  getWork,
} from "../../content-system/query/selectors.js";
import { NoteArticlePage } from "../../features/notes/NoteArticlePage.jsx";
import { NotesPage } from "../../features/notes/NotesPage.jsx";
import { CharacterArchivePage } from "../../features/characters/CharacterArchivePage.jsx";
import { CharacterPage } from "../../features/characters/CharacterPage.jsx";
import { IllustrationsPage } from "../../features/illustrations/IllustrationsPage.jsx";
import { SearchPage } from "../../features/search/SearchPage.jsx";
import { UpdatesPage } from "../../features/updates/UpdatesPage.jsx";
import { PublicLayout } from "../layout/SiteChrome.jsx";
import { AboutPage } from "../pages/AboutPage.jsx";
import { ArticlePage } from "../pages/ArticlePage.jsx";
import { CollectionPage } from "../pages/CollectionPage.jsx";
import { HomePage } from "../pages/HomePage.jsx";
import { NotFoundPage } from "../pages/NotFoundPage.jsx";
import { NovelReaderPage } from "../pages/NovelReaderPage.jsx";
import { WorkPage } from "../pages/WorkPage.jsx";
import { matchPublicRoute } from "./matchPublicRoute.js";
import { PublicExperienceProvider } from "../interaction/PublicExperience.jsx";

function pageForMatch(content, query, match) {
  const { name, params } = match;
  if (name === "home") return <HomePage content={content} />;
  if (name === "works") {
    return (
      <CollectionPage
        eyebrow="Works"
        title="作品"
        intro="目前正在认真完成的故事。"
        items={content.works}
        site={content.site}
        kind="work"
        queryString={query}
      />
    );
  }
  if (name === "characters") {
    return <CharacterArchivePage content={content} queryString={query} />;
  }
  if (name === "illustrations") {
    return <IllustrationsPage content={content} queryString={query} />;
  }
  if (name === "notes") {
    return <NotesPage content={content} queryString={query} />;
  }
  if (name === "updates") {
    return <UpdatesPage content={content} queryString={query} />;
  }
  if (name === "search") {
    return <SearchPage content={content} queryString={query} />;
  }
  if (name === "about") return <AboutPage site={content.site} />;
  if (name === "work") {
    const work = getWork(content, params.workSlug);
    return work
      ? <WorkPage content={content} work={work} />
      : <NotFoundPage />;
  }
  if (name === "chapter") {
    const item = getItem(content, "chapter", params.itemSlug);
    const work = getWork(content, params.workSlug);
    return item && work && item.work === work.slug
      ? work.type === "小说" ? (
          <NovelReaderPage content={content} item={item} work={work} />
        ) : (
          <ArticlePage
            content={content}
            item={item}
            work={work}
            backHref={`#/works/${params.workSlug}`}
            backLabel="返回作品"
          />
        )
      : <NotFoundPage />;
  }
  if (name === "character") {
    const item = getItem(content, "character", params.itemSlug);
    return item
      ? <CharacterPage content={content} character={item} />
      : <NotFoundPage />;
  }
  if (name === "note") {
    const item = getItem(content, "note", params.itemSlug);
    return item
      ? <NoteArticlePage content={content} item={item} />
      : <NotFoundPage />;
  }
  return <NotFoundPage />;
}

export function PublicRouter({ content, route, query = "", navigationType = "load" }) {
  const page = pageForMatch(content, query, matchPublicRoute(route));
  return (
    <PublicExperienceProvider content={content} route={route} query={query} navigationType={navigationType}>
      <PublicLayout site={content.site} route={route}>
        {page}
      </PublicLayout>
    </PublicExperienceProvider>
  );
}
