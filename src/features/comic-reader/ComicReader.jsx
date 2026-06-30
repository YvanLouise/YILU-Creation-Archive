import React, { useEffect, useMemo, useState } from "react";
import { MarkdownView } from "../markdown/MarkdownView.jsx";
import { parseComicBody } from "./domain.js";
import { ProtectedImage } from "../../site/interaction/ProtectedImage.jsx";
import { normalizeAssetPath } from "../../content-system/model/assetPaths.js";
import { usePublicExperience } from "../../site/interaction/PublicExperience.jsx";

function resolveBrowserImageUrl(src) {
  if (typeof window === "undefined") return src;
  return new URL(src, window.location.href).href;
}

function loadAndDecodeImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // Loading succeeded; decode failures should not block the visual fallback.
      }
      resolve();
    };
    image.onerror = () => resolve();
    image.src = resolveBrowserImageUrl(src);
  });
}

function useSequentialImageReveals(sources) {
  const [revealed, setRevealed] = useState(() => new Set());
  const key = sources.join("\n");

  useEffect(() => {
    let cancelled = false;
    setRevealed(new Set());

    async function preloadInOrder() {
      for (let index = 0; index < sources.length; index += 1) {
        await loadAndDecodeImage(sources[index]);
        if (cancelled) return;
        setRevealed((current) => {
          const next = new Set(current);
          next.add(index);
          return next;
        });
      }
    }

    preloadInOrder();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return revealed;
}

export function ComicReader({ source }) {
  const { openLightbox } = usePublicExperience();
  const blocks = parseComicBody(source);
  const images = useMemo(
    () => blocks
      .filter((block) => block.type === "image")
      .map((block) => ({ src: normalizeAssetPath(block.src), alt: block.alt, caption: block.alt })),
    [source],
  );
  const imageSources = useMemo(() => images.map((image) => image.src), [images]);
  const revealedImages = useSequentialImageReveals(imageSources);
  let imageIndex = 0;

  const openImageFromContextMenu = (event, index) => {
    if (!event.target.closest?.("img")) return;
    const desktopPointer = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    if (!desktopPointer) return;
    event.preventDefault();
    event.stopPropagation();
    openLightbox(images, index, event.currentTarget);
  };

  return (
    <div className="comic-reader">
      {blocks.map((block) =>
        block.type === "image"
          ? (() => {
              const currentIndex = imageIndex++;
              return (
              <figure
                key={block.id}
                onContextMenuCapture={(event) => openImageFromContextMenu(event, currentIndex)}
              >
                <ProtectedImage
                  src={block.src}
                  alt={block.alt}
                  caption={block.alt}
                  items={images}
                  index={currentIndex}
                  priority={currentIndex < 2}
                  progressive
                  reveal={revealedImages.has(currentIndex)}
                  showLightboxButton={false}
                />
                <figcaption>{block.alt}</figcaption>
              </figure>
              );
            })()
          : <MarkdownView source={block.text} key={block.id} />,
      )}
    </div>
  );
}
