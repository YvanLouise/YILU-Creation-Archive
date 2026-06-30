import { parseComicBody } from "./domain.js";
import { normalizeAssetPath } from "../../content-system/model/assetPaths.js";

const invalidFileNameChars = /[<>:"/\\|?*\u0000-\u001f：，。；、！“”‘’（）【】《》]+/g;
const watermarkText = "YvanLouise";

function pad(value, length = 3) {
  return String(value).padStart(length, "0");
}

export function safeComicFileNamePart(value, fallback = "untitled") {
  const normalized = String(value || "")
    .replace(invalidFileNameChars, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._\-\s]+|[._\-\s]+$/g, "");
  return normalized.slice(0, 80) || fallback;
}

export function comicEpisodeExportFolderName(work, episode) {
  const episodeNumber = Number(episode?.order) || 1;
  return [
    safeComicFileNamePart(work?.title || work?.slug, "comic"),
    `第${pad(episodeNumber, 2)}话`,
    safeComicFileNamePart(episode?.title || episode?.slug, "episode"),
    "导出",
  ].join("_");
}

export function buildComicEpisodeExportManifest({ work, episode, source }) {
  const blocks = parseComicBody(source);
  const images = blocks.filter((block) => block.type === "image");
  const workName = safeComicFileNamePart(work?.title || work?.slug, "comic");
  const episodeNumber = Number(episode?.order) || 1;
  const episodeTitle = safeComicFileNamePart(episode?.title || episode?.slug, "episode");
  const episodeLabel = `第${pad(episodeNumber, 2)}话`;

  return images.map((block, index) => ({
    src: normalizeAssetPath(block.src),
    alt: block.alt,
    pageIndex: index + 1,
    fileName: `${pad(index + 1, 4)}_${workName}_${episodeLabel}_${episodeTitle}_P${pad(index + 1)}.png`,
  }));
}

function createDefaultCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法创建图片导出画布。");
  return { canvas, context };
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("水印图片生成失败。"));
    }, "image/png");
  });
}

export async function drawWatermarkedImageToPngBlob(
  image,
  { canvasFactory = createDefaultCanvas, text = watermarkText } = {},
) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error("图片尺寸读取失败。");

  const { canvas, context } = canvasFactory(width, height);
  context.drawImage(image, 0, 0, width, height);

  const margin = Math.max(24, Math.round(width * 0.02));
  const fontSize = Math.max(18, Math.round(width * 0.032));
  context.save();
  context.globalAlpha = 0.72;
  context.font = `600 ${fontSize}px "Segoe UI", Arial, sans-serif`;
  context.textAlign = "right";
  context.textBaseline = "bottom";
  context.lineWidth = Math.max(2, Math.round(fontSize * 0.14));
  context.strokeStyle = "rgba(0, 0, 0, 0.55)";
  context.fillStyle = "rgba(255, 255, 255, 0.92)";
  context.shadowColor = "rgba(0, 0, 0, 0.32)";
  context.shadowBlur = Math.max(4, Math.round(fontSize * 0.22));
  context.strokeText(text, width - margin, height - margin);
  context.fillText(text, width - margin, height - margin);
  context.restore();

  return canvasToPngBlob(canvas);
}

function resolveImageUrl(src) {
  return new URL(src, window.location.href).href;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`无法读取图片：${src}`));
    image.src = resolveImageUrl(src);
  });
}

async function watermarkedBlobForEntry(entry) {
  const image = await loadImage(entry.src);
  try {
    return await drawWatermarkedImageToPngBlob(image);
  } catch (error) {
    throw new Error(`第 ${entry.pageIndex} 页导出失败：${error.message}`);
  }
}

async function writeDirectoryExport({ manifest, folderName, directoryPicker }) {
  const rootHandle = await directoryPicker({
    id: "ilu-public-comic-export",
    mode: "readwrite",
    startIn: "downloads",
  });
  const targetHandle = await rootHandle.getDirectoryHandle(folderName, { create: true });

  for (const entry of manifest) {
    const blob = await watermarkedBlobForEntry(entry);
    const fileHandle = await targetHandle.getFileHandle(entry.fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
}

async function downloadFallback(manifest) {
  for (const entry of manifest) {
    const blob = await watermarkedBlobForEntry(entry);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = entry.fileName;
    link.click();
    URL.revokeObjectURL(link.href);
    await new Promise((resolve) => window.setTimeout(resolve, 40));
  }
}

export async function exportComicEpisodePages({
  work,
  episode,
  source,
  directoryPicker = typeof window !== "undefined" ? window.showDirectoryPicker?.bind(window) : null,
} = {}) {
  const manifest = buildComicEpisodeExportManifest({ work, episode, source });
  if (!manifest.length) throw new Error("当前话没有可导出的漫画页面。");

  const folderName = comicEpisodeExportFolderName(work, episode);
  if (directoryPicker) {
    await writeDirectoryExport({ manifest, folderName, directoryPicker });
    return { mode: "directory", count: manifest.length, folderName };
  }

  await downloadFallback(manifest);
  return { mode: "downloads", count: manifest.length, folderName: "" };
}
