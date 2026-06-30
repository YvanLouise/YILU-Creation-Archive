import React from "react";
import { ArrowRight } from "lucide-react";

export function ButtonLink({ href, variant = "primary", children }) {
  return (
    <a className={`button button-${variant}`} href={href}>
      {children}<ArrowRight size={17} />
    </a>
  );
}
