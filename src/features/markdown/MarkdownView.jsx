import React from "react";
import { ProtectedImage } from "../../site/interaction/ProtectedImage.jsx";

const imagePattern = /^!\[([^\]]+)\]\(([^)]+)\)$/;
const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

function inline(text) {
  const nodes = [];
  let cursor = 0;
  for (const match of text.matchAll(linkPattern)) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    nodes.push(
      <a href={match[2]} key={`${match.index}-${match[2]}`}>
        {match[1]}
      </a>,
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function MarkdownView({ source }) {
  const lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
  const images = lines
    .map((line) => line.trim().match(imagePattern))
    .filter(Boolean)
    .map((image) => ({ src: image[2], alt: image[1], caption: image[1] }));
  const blocks = [];
  let paragraph = [];
  let list = [];
  let imageIndex = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={`p-${blocks.length}`}>{inline(paragraph.join(" "))}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {list.map((item, index) => <li key={`${index}-${item}`}>{inline(item)}</li>)}
        </ul>,
      );
      list = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("<")) {
      paragraph.push(line.replaceAll("<", "&lt;").replaceAll(">", "&gt;"));
      continue;
    }
    const image = line.match(imagePattern);
    if (image) {
      flushParagraph();
      flushList();
      blocks.push(
        <figure key={`img-${blocks.length}`}>
          <ProtectedImage
            src={image[2]}
            alt={image[1]}
            caption={image[1]}
            items={images}
            index={imageIndex}
          />
          <figcaption>{image[1]}</figcaption>
        </figure>,
      );
      imageIndex += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push(<h1 key={`h1-${blocks.length}`}>{line.slice(2)}</h1>);
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push(<h2 key={`h2-${blocks.length}`}>{line.slice(3)}</h2>);
      continue;
    }
    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      blocks.push(<blockquote key={`quote-${blocks.length}`}>{inline(line.slice(2))}</blockquote>);
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return <div className="markdown-body">{blocks}</div>;
}
