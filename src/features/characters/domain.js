import {
  createContentIndex,
  publishedCharactersForVisibleWorksOrNone,
} from "../../content-system/query/selectors.js";

export const unassignedCharacterWork = {
  slug: "__none__",
  title: "暂无",
  subtitle: "",
  description: "暂未归属到具体作品的角色档案。",
  type: "暂无",
  hidden: false,
  order: Number.MAX_SAFE_INTEGER,
  isUnassigned: true,
};

export function characterArchiveId(character) {
  return `CHAR-${String(character.order || 0).padStart(3, "0")}`;
}

export function visibleCharacters(content) {
  const index = createContentIndex(content);
  const workOrder = new Map(index.works.map((work, position) => [work.slug, position]));
  const workPosition = (slug) =>
    slug && workOrder.has(slug) ? workOrder.get(slug) : Number.MAX_SAFE_INTEGER;
  return publishedCharactersForVisibleWorksOrNone(content.characters, index)
    .sort((left, right) =>
      workPosition(left.work) - workPosition(right.work) ||
      left.order - right.order ||
      left.title.localeCompare(right.title, "zh-CN"));
}

export function characterGroups(content) {
  const characters = visibleCharacters(content);
  const workGroups = content.works
    .filter((work) => !work.hidden)
    .sort((left, right) => left.order - right.order)
    .map((work) => ({
      work,
      characters: characters.filter((character) => character.work === work.slug),
    }))
    .filter((group) => group.characters.length);
  const unassigned = characters.filter((character) => !character.work);
  return unassigned.length
    ? [...workGroups, { work: unassignedCharacterWork, characters: unassigned }]
    : workGroups;
}

export function characterNeighbors(content, character) {
  const characters = visibleCharacters(content);
  const index = characters.findIndex((item) => item.slug === character.slug);
  return {
    previous: index > 0 ? characters[index - 1] : null,
    next: index >= 0 && index < characters.length - 1 ? characters[index + 1] : null,
  };
}

export function relatedCharacters(content, character) {
  return visibleCharacters(content).filter(
    (item) => item.work === character.work && item.slug !== character.slug,
  );
}
