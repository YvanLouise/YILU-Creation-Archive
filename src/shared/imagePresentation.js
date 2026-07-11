export const DEFAULT_IMAGE_PRESENTATION = Object.freeze({
  focusX: 50,
  focusY: 50,
  zoom: 1,
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeImagePresentation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_IMAGE_PRESENTATION };
  }
  const focusX = clamp(numberOr(value.focusX, DEFAULT_IMAGE_PRESENTATION.focusX), 0, 100);
  const focusY = clamp(numberOr(value.focusY, DEFAULT_IMAGE_PRESENTATION.focusY), 0, 100);
  const requestedZoom = clamp(numberOr(value.zoom, DEFAULT_IMAGE_PRESENTATION.zoom), 1, 3);
  const focusDistance = Math.max(Math.abs(focusX - 50), Math.abs(focusY - 50));
  return {
    focusX,
    focusY,
    // A moved focus needs overflow space. Older records saved zoom: 1 after dragging,
    // which made their crop visually identical to the default image.
    zoom: Math.max(requestedZoom, 1 + Math.min(.24, focusDistance / 140)),
  };
}

export function isCustomImagePresentation(value) {
  if (!value || typeof value !== "object") return false;
  const presentation = normalizeImagePresentation(value);
  return presentation.focusX !== DEFAULT_IMAGE_PRESENTATION.focusX
    || presentation.focusY !== DEFAULT_IMAGE_PRESENTATION.focusY
    || presentation.zoom !== DEFAULT_IMAGE_PRESENTATION.zoom;
}

export function imagePresentationStyle(value) {
  const presentation = normalizeImagePresentation(value);
  return {
    "--image-focus-x": `${presentation.focusX}%`,
    "--image-focus-y": `${presentation.focusY}%`,
    "--image-zoom": String(presentation.zoom),
  };
}
