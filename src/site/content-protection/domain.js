export const copyAllowedSelector = [
  "input",
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  "[data-copy-allowed]",
].join(", ");

export function isCopyAllowedTarget(target) {
  return Boolean(
    target
    && typeof target.closest === "function"
    && target.closest(copyAllowedSelector),
  );
}

export function isImageTarget(target) {
  return Boolean(
    target
    && typeof target.closest === "function"
    && target.closest("img"),
  );
}
