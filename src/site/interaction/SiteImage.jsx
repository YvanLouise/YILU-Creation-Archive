import React from "react";
import { ProtectedImage } from "./ProtectedImage.jsx";

export function SiteImage({
  alt = "",
  className = "",
  presentation,
  priority = false,
  src,
  wrapperClassName = "",
}) {
  return (
    <ProtectedImage
      alt={alt}
      className={className}
      presentation={presentation}
      priority={priority}
      showLightboxButton={false}
      src={src}
      wrapperClassName={`site-image${wrapperClassName ? ` ${wrapperClassName}` : ""}`}
    />
  );
}
