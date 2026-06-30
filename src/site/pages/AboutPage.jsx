import React from "react";
import { SiteImage } from "../interaction/SiteImage.jsx";

export function AboutPage({ site }) {
  return (
    <main className="about-page section-shell">
      <SiteImage src={site.author.avatar} alt="" />
      <div>
        <div className="section-label"><span />About</div>
        <h1>你好，我是{site.author.name}</h1>
        <p>{site.author.intro}</p>
        <p>
          这个网站会和我的创作一起慢慢长大。比起填满许多空洞的栏目，
          我更希望认真留下每一次完成的章节和练习。
        </p>
      </div>
    </main>
  );
}
