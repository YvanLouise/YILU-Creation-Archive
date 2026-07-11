import React, { useState } from "react";
import { ProtectedImage } from "../../site/interaction/ProtectedImage.jsx";
import { parseNovelInline, splitNovelBlocks } from "./novelFormatting.js";

const imagePattern = /^!\[([^\]]+)\]\(([^)]+)\)$/;

function HiddenText({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      className={open ? "novel-fx-hidden revealed" : "novel-fx-hidden"}
      type="button"
      aria-expanded={open}
      aria-label={open ? "隐藏文字已展开" : "展开隐藏文字"}
      onClick={() => setOpen((value) => !value)}
    >
      {open ? text : "隐藏文字"}
    </button>
  );
}

function inline(text) {
  return parseNovelInline(text).map((token, index) => {
    const key = `${token.type}-${index}-${token.text}`;
    if (token.type === "link") return <a href={token.href} key={key}>{token.text}</a>;
    if (token.type === "strike") return <del className="novel-fx-strike" key={key}>{token.text}</del>;
    if (token.type === "mark") return <mark className="novel-fx-mark" key={key}>{token.text}</mark>;
    if (token.type === "hide") return <HiddenText text={token.text} key={key} />;
    if (token.type === "blur") return <span className="novel-fx-blur" key={key}>{token.text}</span>;
    if (token.type === "thought") return <span className="novel-fx-thought" key={key}>{token.text}</span>;
    if (token.type === "aside") return <span className="novel-fx-aside" key={key}>{token.text}</span>;
    return token.text;
  });
}

export function MarkdownView({ source, resolveImageSrc }) {
  const lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
  const images = lines
    .map((line) => line.trim().match(imagePattern))
    .filter(Boolean)
    .map((image) => ({ src: resolveImageSrc?.(image[2]) || image[2], alt: image[1], caption: image[1] }));
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

  for (const block of splitNovelBlocks(lines)) {
    if (block.type === "notice" || block.type === "letter") {
      flushParagraph();
      flushList();
      blocks.push(
        <aside className={`novel-fx-block novel-fx-${block.type}`} key={`${block.type}-${blocks.length}`}>
          {block.title ? <strong>{inline(block.title)}</strong> : null}
          <MarkdownView source={block.body} resolveImageSrc={resolveImageSrc} />
        </aside>,
      );
      continue;
    }

    const rawLine = block.line;
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
            src={resolveImageSrc?.(image[2]) || image[2]}
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
