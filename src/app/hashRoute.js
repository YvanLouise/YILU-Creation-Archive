export function parseHashLocation(value) {
  const hash = String(value || "").replace(/^#/, "") || "/";
  const anchorIndex = hash.indexOf("#");
  const pathAndQuery = anchorIndex === -1 ? hash : hash.slice(0, anchorIndex);
  const queryIndex = pathAndQuery.indexOf("?");
  return {
    route: queryIndex === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIndex),
    query: queryIndex === -1 ? "" : pathAndQuery.slice(queryIndex + 1),
    anchor: anchorIndex === -1 ? "" : hash.slice(anchorIndex + 1),
  };
}
