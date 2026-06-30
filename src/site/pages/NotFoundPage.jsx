import React from "react";
import { Sparkles } from "lucide-react";
import { ButtonLink } from "../../shared/components/ButtonLink.jsx";

export function NotFoundPage() {
  return (
    <main className="placeholder-page section-shell">
      <Sparkles size={34} />
      <p>没有找到这页内容</p>
      <h1>故事走到了空白处</h1>
      <ButtonLink href="#/" variant="secondary">返回首页</ButtonLink>
    </main>
  );
}
