import {
  assertSafeRepositoryPath,
  publishRequestSchema,
} from "../model/schema.js";
import { serializeContent } from "./serialize.js";

export function buildPublishRequest({
  content,
  media,
  readme,
  baseSha,
  message,
  baselinePaths = [],
}) {
  const upserts = serializeContent(content, media, readme);
  const nextPaths = new Set(upserts.map((file) => file.path));
  const deletions = baselinePaths
    .filter((path) => !nextPaths.has(path))
    .map((path) => ({
      path: assertSafeRepositoryPath(path),
      action: "delete",
    }));
  const request = {
    baseSha,
    message,
    files: [...upserts, ...deletions],
  };
  publishRequestSchema.parse(request);
  return request;
}
