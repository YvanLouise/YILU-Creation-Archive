import React from "react";
import { ProtectedImage } from "./ProtectedImage.jsx";

export function SiteImage({ alt = "", className = "", priority = false, src, wrapperClassName = "" }) {
  return (
    <ProtectedImage
      alt={alt}
      className={className}
      priority={priority}
      showLightboxButton={false}
      src={src}
      wrapperClassName={`site-image${wrapperClassName ? ` ${wrapperClassName}` : ""}`}
    />
  );
}
