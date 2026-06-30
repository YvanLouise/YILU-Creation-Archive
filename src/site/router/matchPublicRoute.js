export function matchPublicRoute(route) {
  if (route === "/") return { name: "home", params: {} };
  if (route === "/works") return { name: "works", params: {} };
  if (route === "/characters") return { name: "characters", params: {} };
  if (route === "/illustrations") return { name: "illustrations", params: {} };
  if (route === "/notes") return { name: "notes", params: {} };
  if (route === "/updates") return { name: "updates", params: {} };
  if (route === "/about") return { name: "about", params: {} };
  if (route === "/search") return { name: "search", params: {} };

  const parts = route.split("/").filter(Boolean);
  if (parts[0] === "works" && parts.length === 2) {
    return { name: "work", params: { workSlug: parts[1] } };
  }
  if (
    parts[0] === "works" &&
    parts[2] === "chapters" &&
    parts.length === 4
  ) {
    return {
      name: "chapter",
      params: { workSlug: parts[1], itemSlug: parts[3] },
    };
  }
  if (parts[0] === "characters" && parts.length === 2) {
    return { name: "character", params: { itemSlug: parts[1] } };
  }
  if (parts[0] === "notes" && parts.length === 2) {
    return { name: "note", params: { itemSlug: parts[1] } };
  }
  return { name: "notFound", params: {} };
}
