import React from "react";

export function EmptyState({
  className = "",
  icon: Icon,
  title,
  description,
  children,
}) {
  return (
    <section className={`archive-empty ${className}`.trim()}>
      {Icon ? <Icon size={28} /> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  );
}
