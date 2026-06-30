import site from "../../content/site.json";
import { parseMarkdownFile } from "../markdown/frontmatter.js";
import { normalizeContent } from "../model/normalize.js";

const workModules = import.meta.glob("../../content/works/*/work.json", {
  eager: true,
  import: "default",
});
const chapterModules = import.meta.glob("../../content/works/*/chapters/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});
const characterModules = import.meta.glob("../../content/characters/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});
const noteModules = import.meta.glob("../../content/notes/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});
const illustrationModules = import.meta.glob("../../content/illustrations/*.json", {
  eager: true,
  import: "default",
});

function repositoryPath(path) {
  return path.replace("../../", "src/");
}

function markdownItem(kind, source, path) {
  const parsed = parseMarkdownFile(source);
  return {
    kind,
    path: repositoryPath(path),
    ...parsed.meta,
    body: parsed.body,
  };
}

export function loadBrowserContent() {
  return normalizeContent({
    site,
    works: Object.entries(workModules).map(([path, work]) => ({
      ...work,
      path: repositoryPath(path),
    })),
    chapters: Object.entries(chapterModules).map(([path, source]) =>
      markdownItem("chapter", source, path),
    ),
    characters: Object.entries(characterModules).map(([path, source]) =>
      markdownItem("character", source, path),
    ),
    notes: Object.entries(noteModules).map(([path, source]) =>
      markdownItem("note", source, path),
    ),
    illustrations: Object.entries(illustrationModules).map(([path, illustration]) => ({
      ...illustration,
      path: repositoryPath(path),
    })),
  });
}

export const initialContent = loadBrowserContent();
