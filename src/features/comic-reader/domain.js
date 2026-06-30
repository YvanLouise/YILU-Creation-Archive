const imageLinePattern = /^!\[([^\]]*)\]\(([^)]+)\)$/;

function blockId(prefix, index) {
  return `${prefix}-${index}`;
}

export function parseComicBody(source) {
  const chunks = String(source || "").replace(/\r\n/g, "\n").split(/\n{2,}/);
  return chunks
    .map((chunk, index) => {
      const value = chunk.trim();
      if (!value) return null;
      const image = value.match(imageLinePattern);
      if (image) {
        return { id: blockId("image", index), type: "image", alt: image[1], src: image[2] };
      }
      return { id: blockId("text", index), type: "text", text: value };
    })
    .filter(Boolean);
}

export function serializeComicBody(blocks) {
  return blocks
    .map((block) => {
      if (block.type === "image") return `![${block.alt.trim()}](${block.src})`;
      return String(block.text || "").trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

export function moveComicBlock(blocks, sourceId, targetId) {
  const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
  const targetIndex = blocks.findIndex((block) => block.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function createComicImageBlock(mediaItem) {
  return {
    id: `image-${mediaItem.id}`,
    type: "image",
    alt: mediaItem.name.replace(/\.[^.]+$/, ""),
    src: `./${mediaItem.path.replace(/^public\//, "")}`,
  };
}

export function validateComicBlocks(blocks) {
  const issues = [];
  for (const [index, block] of blocks.entries()) {
    if (block.type === "image" && !block.alt.trim()) {
      issues.push(`第 ${index + 1} 个漫画页面缺少替代文本`);
    }
  }
  if (!blocks.some((block) => block.type === "image")) issues.push("漫画话至少需要一张图片");
  return issues;
}
