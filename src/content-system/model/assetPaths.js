const assetPathPrefixes = /^(assets|uploads)\//;
const externalPathPattern = /^(?:[a-z][a-z\d+.-]*:|#|\/)/i;

export function normalizeAssetPath(value) {
  if (value === undefined || value === null) return "";
  let path = String(value)
    .trim()
    .replace(/\\/g, "/")
    .replace(/^["']+|["']+$/g, "")
    .trim();

  if (!path) return "";
  if (externalPathPattern.test(path)) return path;

  path = path
    .replace(/^\.\/+/, "")
    .replace(/^public\//, "");

  return assetPathPrefixes.test(path) ? `./${path}` : path;
}

export function normalizeMarkdownImagePaths(source) {
  return String(source || "").replace(
    /(!\[[^\]]*]\()([^)]+)(\))/g,
    (_match, before, path, after) => `${before}${normalizeAssetPath(path)}${after}`,
  );
}

export function normalizeContentAssetPaths(content) {
  const next = structuredClone(content);
  if (next.site?.author?.avatar !== undefined) {
    next.site.author.avatar = normalizeAssetPath(next.site.author.avatar);
  }
  next.works = (next.works || []).map((work) => ({
    ...work,
    cover: normalizeAssetPath(work.cover),
  }));
  next.chapters = (next.chapters || []).map((chapter) => ({
    ...chapter,
    cover: chapter.cover === undefined ? chapter.cover : normalizeAssetPath(chapter.cover),
    body: normalizeMarkdownImagePaths(chapter.body),
    sections: (chapter.sections || []).map((section) => ({
      ...section,
      body: normalizeMarkdownImagePaths(section.body),
    })),
  }));
  next.characters = (next.characters || []).map((character) => ({
    ...character,
    cover: character.cover === undefined ? character.cover : normalizeAssetPath(character.cover),
    body: normalizeMarkdownImagePaths(character.body),
    abilities: (character.abilities || []).map((ability) => ({
      ...ability,
      image: normalizeAssetPath(ability.image),
    })),
    gallery: (character.gallery || []).map((image) => ({
      ...image,
      image: normalizeAssetPath(image.image),
    })),
  }));
  next.notes = (next.notes || []).map((note) => ({
    ...note,
    cover: note.cover === undefined ? note.cover : normalizeAssetPath(note.cover),
    body: normalizeMarkdownImagePaths(note.body),
  }));
  next.illustrations = (next.illustrations || []).map((illustration) => ({
    ...illustration,
    image: normalizeAssetPath(illustration.image),
  }));
  return next;
}
