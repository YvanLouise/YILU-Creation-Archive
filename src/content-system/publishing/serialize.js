import {
  assertSafeRepositoryPath,
  ContentValidationError,
  validateContent,
} from "../model/schema.js";
import { stringifyMarkdownFile } from "../markdown/frontmatter.js";
import { normalizeContentAssetPaths } from "../model/assetPaths.js";

function markdownFile(item, path) {
  const { body, kind, path: _oldPath, ...meta } = item;
  return {
    path,
    action: "upsert",
    encoding: "utf-8",
    content: stringifyMarkdownFile(meta, body),
  };
}

export function serializeContent(content, media = [], readme = null) {
  const normalizedContent = normalizeContentAssetPaths(content);
  const validationIssues = validateContent(normalizedContent);
  if (validationIssues.length) {
    throw new ContentValidationError(validationIssues);
  }
  const publishedWorks = normalizedContent.works.filter((work) => !work.hidden);
  const publishedWorkSlugs = new Set(publishedWorks.map((work) => work.slug));
  if (!publishedWorkSlugs.has(normalizedContent.site.featuredWorkSlug)) {
    throw new Error("主推作品必须处于公开状态");
  }
  const publishedChapters = normalizedContent.chapters.filter(
    (item) =>
      item.status === "published" &&
      publishedWorkSlugs.has(item.work),
  );
  const publishedCharacters = normalizedContent.characters.filter(
    (item) =>
      item.status === "published" &&
      (!item.work || publishedWorkSlugs.has(item.work)),
  );
  const publishedNotes = normalizedContent.notes.filter(
    (item) => item.status === "published",
  );
  const publishedIllustrations = (normalizedContent.illustrations || []).filter(
    (item) => item.status === "published",
  );
  const { updates: _legacyUpdates, ...publishedSite } = normalizedContent.site;
  const files = [
    ...(typeof readme === "string"
      ? [{
          path: "README.md",
          action: "upsert",
          encoding: "utf-8",
          content: readme.endsWith("\n") ? readme : `${readme}\n`,
        }]
      : []),
    {
      path: "src/content/site.json",
      action: "upsert",
      encoding: "utf-8",
      content: `${JSON.stringify(publishedSite, null, 2)}\n`,
    },
    ...publishedWorks.map((work) => ({
      path: `src/content/works/${work.slug}/work.json`,
      action: "upsert",
      encoding: "utf-8",
      content: `${JSON.stringify(
        Object.fromEntries(
          Object.entries(work).filter(([key]) => key !== "path"),
        ),
        null,
        2,
      )}\n`,
    })),
    ...publishedChapters.map((item) =>
      markdownFile(
        item,
        `src/content/works/${item.work}/chapters/${item.slug}.md`,
      ),
    ),
    ...publishedCharacters.map((item) =>
      markdownFile(item, `src/content/characters/${item.slug}.md`),
    ),
    ...publishedNotes.map((item) =>
      markdownFile(item, `src/content/notes/${item.slug}.md`),
    ),
    ...publishedIllustrations.map((item) => ({
      path: `src/content/illustrations/${item.slug}.json`,
      action: "upsert",
      encoding: "utf-8",
      content: `${JSON.stringify(
        Object.fromEntries(
          Object.entries(item).filter(([key]) => key !== "path"),
        ),
        null,
        2,
      )}\n`,
    })),
    ...media.map((item) => ({
      path: item.path,
      action: "upsert",
      encoding: "base64",
      content: item.data.split(",")[1],
    })),
  ];
  files.forEach((file) => assertSafeRepositoryPath(file.path));
  return files;
}
