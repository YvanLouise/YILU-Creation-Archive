import {
  createContentIndex,
  publishedCharactersForVisibleWorksOrNone,
  publishedItems,
  publishedItemsForVisibleWorks,
} from "../../content-system/query/selectors.js";

export function resolveHomeStats(content) {
  const index = createContentIndex(content);
  return [
    { label: "正在创作", value: `${index.works.length} 部` },
    {
      label: "已发布章节",
      value: `${publishedItemsForVisibleWorks(content.chapters, index).length} 篇`,
    },
    {
      label: "角色设定",
      value: `${publishedCharactersForVisibleWorksOrNone(content.characters, index).length} 位`,
    },
    {
      label: "创作笔记",
      value: `${publishedItems(content.notes).length} 篇`,
    },
  ];
}
