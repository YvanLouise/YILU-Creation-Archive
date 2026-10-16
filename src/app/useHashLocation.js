import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { parseHashLocation } from "./hashRoute.js";
import { createRouteTransitionController } from "./routeTransition.js";
import { consumeNavigationType } from "../site/interaction/navigationIntent.js";

function currentHashLocation() {
  return { ...parseHashLocation(window.location.hash), navigationType: "load" };
}

export function useHashLocation() {
  const [location, setLocation] = useState(currentHashLocation);
  const locationRef = useRef(location);
  useEffect(() => {
    const transitions = createRouteTransitionController(document);
    const update = () => {
      const next = {
        ...parseHashLocation(window.location.hash),
        navigationType: consumeNavigationType(),
      };
      const from = locationRef.current.route;
      locationRef.current = next;
      transitions.navigate({ from, to: next.route, navigationType: next.navigationType }, () => {
        flushSync(() => setLocation(next));
      });
    };
    window.addEventListener("hashchange", update);
    return () => {
      window.removeEventListener("hashchange", update);
      transitions.dispose();
    };
  }, []);
  return location;
}
