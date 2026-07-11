import test from "node:test";
import assert from "node:assert/strict";
import {
  parseNovelInline,
  splitNovelBlocks,
  stripNovelFormatting,
} from "../src/features/markdown/novelFormatting.js";

test("parses novel inline formatting without swallowing adjacent text", () => {
  assert.deepEqual(parseNovelInline("前~~删除~~中==重点==后").map((token) => [token.type, token.text]), [
    ["text", "前"],
    ["strike", "删除"],
    ["text", "中"],
    ["mark", "重点"],
    ["text", "后"],
  ]);
  assert.deepEqual(parseNovelInline("{{hide:秘密}}{{blur:雾中文字}}{{thought:我知道}}{{aside:旁白}}").map((token) => [token.type, token.text]), [
    ["hide", "秘密"],
    ["blur", "雾中文字"],
    ["thought", "我知道"],
    ["aside", "旁白"],
  ]);
});

test("keeps malformed novel inline formatting as text", () => {
  assert.deepEqual(parseNovelInline("未闭合 {{hide:秘密").map((token) => token.text).join(""), "未闭合 {{hide:秘密");
  assert.deepEqual(parseNovelInline("{{unknown:文字}}").map((token) => token.text).join(""), "{{unknown:文字}}");
});

test("splits notice and letter blocks across multiple lines", () => {
  const blocks = splitNovelBlocks([
    "开头",
    ":::notice 谜题",
    "第一行",
    "第二行",
    ":::",
    ":::letter 来信",
    "信件正文",
    ":::",
  ]);
  assert.deepEqual(blocks, [
    { type: "line", line: "开头" },
    { type: "notice", title: "谜题", body: "第一行\n第二行" },
    { type: "letter", title: "来信", body: "信件正文" },
  ]);
});

test("strips novel formatting while keeping readable text", () => {
  const source = "~~删除~~ ==重点== {{hide:秘密}}\n:::notice 提示\n正文\n:::";
  assert.equal(stripNovelFormatting(source).replace(/\s+/g, " ").trim(), "删除 重点 秘密 提示 正文");
});
