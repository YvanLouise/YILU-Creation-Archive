import { useEffect, useState } from "react";
import { parseHashLocation } from "./hashRoute.js";
import { consumeNavigationType } from "../site/interaction/navigationIntent.js";

function currentHashLocation() {
  return { ...parseHashLocation(window.location.hash), navigationType: "load" };
}

export function useHashLocation() {
  const [location, setLocation] = useState(currentHashLocation);
  useEffect(() => {
    const update = () => setLocation({
      ...parseHashLocation(window.location.hash),
      navigationType: consumeNavigationType(),
    });
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return location;
}
