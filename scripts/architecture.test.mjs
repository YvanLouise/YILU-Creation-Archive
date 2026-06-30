import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(fullPath)
      : /\.(?:js|jsx|mjs)$/.test(entry.name) ? [fullPath] : [];
  });
}

function importsOf(file) {
  const source = fs.readFileSync(file, "utf8");
  return [...source.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g)]
    .map((match) => match[1]);
}

test("content-system stays framework independent", () => {
  const files = sourceFiles(path.join(root, "src", "content-system"));
  const violations = files.flatMap((file) =>
    importsOf(file)
      .filter((specifier) => specifier === "react" || specifier.startsWith("../site") || specifier.startsWith("../admin"))
      .map((specifier) => `${path.relative(root, file)} -> ${specifier}`),
  );
  assert.deepEqual(violations, []);
});

test("public site never imports local admin code", () => {
  const files = [
    ...sourceFiles(path.join(root, "src", "app")),
    ...sourceFiles(path.join(root, "src", "site")),
    ...sourceFiles(path.join(root, "src", "features")),
    ...sourceFiles(path.join(root, "src", "shared")),
  ];
  const violations = files.flatMap((file) =>
    importsOf(file)
      .filter((specifier) => specifier.includes("/admin") || specifier.startsWith("../admin"))
      .map((specifier) => `${path.relative(root, file)} -> ${specifier}`),
  );
  assert.deepEqual(violations, []);
});

test("shared components stay independent from feature and page modules", () => {
  const files = sourceFiles(path.join(root, "src", "shared"));
  const violations = files.flatMap((file) =>
    importsOf(file)
      .filter((specifier) => specifier.includes("/features/") || specifier.includes("/site/"))
      .map((specifier) => `${path.relative(root, file)} -> ${specifier}`),
  );
  assert.deepEqual(violations, []);
});

test("admin app delegates standalone pages and infrastructure", () => {
  const adminAppPath = path.join(root, "src", "admin", "AdminApp.jsx");
  if (!fs.existsSync(adminAppPath)) {
    return;
  }

  const adminApp = fs.readFileSync(adminAppPath, "utf8");
  const forbiddenImplementations = [
    "function MediaLibrary(",
    "function SiteSettings(",
    "function PublishPanel(",
    "function createMediaEntries(",
    "function readAsDataUrl(",
  ];

  assert.deepEqual(
    forbiddenImplementations.filter((marker) => adminApp.includes(marker)),
    [],
  );
});
