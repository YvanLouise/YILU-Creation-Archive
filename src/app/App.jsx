import React from "react";
import { initialContent } from "../content-system/repository/browserContentRepository.js";
import { PublicRouter } from "../site/router/PublicRouter.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { useHashLocation } from "./useHashLocation.js";
import { useRouteScroll } from "./useRouteScroll.js";

export default function App() {
  const { route, query, anchor, navigationType } = useHashLocation();
  useRouteScroll(route, query, anchor, navigationType);
  return (
    <ErrorBoundary>
      <PublicRouter content={initialContent} route={route} query={query} navigationType={navigationType} />
    </ErrorBoundary>
  );
}
