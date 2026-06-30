import React, { useEffect, useState } from "react";
import { Maximize2 } from "lucide-react";
import { normalizeAssetPath } from "../../content-system/model/assetPaths.js";
import { useOptionalPublicExperience } from "./PublicExperience.jsx";
import { normalizeLightboxItems } from "./domain.js";

export function ProtectedImage({
  alt,
  caption = "",
  className = "",
  index = 0,
  items,
  priority = false,
  progressive = true,
  reveal,
  showLightboxButton = true,
  src,
  wrapperClassName = "",
}) {
  const experience = useOptionalPublicExperience();
  const imageSrc = normalizeAssetPath(src);
  const [autoRevealed, setAutoRevealed] = useState(false);
  const isRevealed = reveal ?? autoRevealed;
  const normalizedItems = (items?.length ? items : [{ src, alt, caption }]).map((item) => ({
    ...item,
    src: normalizeAssetPath(item.src),
  }));
  const group = normalizeLightboxItems(normalizedItems);
  const canOpenLightbox = showLightboxButton && experience?.openLightbox;

  useEffect(() => {
    if (!progressive || reveal !== undefined) return undefined;
    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // A loaded image is still usable even if explicit decode rejects.
      }
      if (!cancelled) setAutoRevealed(true);
    };
    image.onerror = () => {
      if (!cancelled) setAutoRevealed(true);
    };
    setAutoRevealed(false);
    image.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [imageSrc, progressive, reveal]);

  if (progressive) {
    return (
      <span
        className={`protected-image progressive-image${isRevealed ? " is-revealed" : ""}${wrapperClassName ? ` ${wrapperClassName}` : ""}`}
        role={isRevealed ? undefined : "img"}
        aria-label={isRevealed ? undefined : alt}
      >
        <img
          className={`progressive-image-preview${className ? ` ${className}` : ""}`}
          src={imageSrc}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchpriority={priority ? "high" : "auto"}
          loading={priority ? "eager" : "lazy"}
        />
        {isRevealed ? (
          <img
            className={`progressive-image-full${className ? ` ${className}` : ""}`}
            src={imageSrc}
            alt={alt}
            decoding="async"
            fetchpriority={priority ? "high" : "auto"}
            loading="eager"
          />
        ) : null}
        {canOpenLightbox ? (
          <button
            type="button"
            aria-label={`沉浸查看${caption || alt || "图片"}`}
            onClick={(event) => experience.openLightbox(group, index, event.currentTarget)}
          >
            <Maximize2 size={16} />
            <span>查看</span>
          </button>
        ) : null}
      </span>
    );
  }

  if (!canOpenLightbox) {
    return (
      <span className={`protected-image${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
        <img className={className} src={imageSrc} alt={alt} />
      </span>
    );
  }

  return (
    <span className={`protected-image${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
      <img className={className} src={imageSrc} alt={alt} />
      <button
        type="button"
        aria-label={`沉浸查看${caption || alt || "图片"}`}
        onClick={(event) => experience.openLightbox(group, index, event.currentTarget)}
      >
        <Maximize2 size={16} />
        <span>查看</span>
      </button>
    </span>
  );
}
