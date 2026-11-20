import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = path.resolve(import.meta.dirname, "..");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/link") return { url: "feed-test:link", shortCircuit: true };
    const target = specifier.startsWith("@/") ? pathToFileURL(path.join(root, "src", specifier.slice(2))).href : specifier;
    if ((target.startsWith(".") || target.startsWith("file:")) && !path.extname(target)) {
      const base = new URL(target, context.parentURL);
      for (const ext of [".ts", ".tsx", "/index.ts"]) if (existsSync(fileURLToPath(base) + ext)) return nextResolve(base.href + ext, context);
    }
    return nextResolve(target, context);
  },
  load(url, context, nextLoad) {
    if (url === "feed-test:link") return { format: "module", shortCircuit: true, source: `import React from ${JSON.stringify(pathToFileURL(path.join(root, "node_modules/react/index.js")).href)}; export default function Link(props) { return React.createElement("a", props); }` };
    if (url.endsWith(".css")) return { format: "module", shortCircuit: true, source: "export default new Proxy({}, { get: (_, key) => String(key) });" };
    if (url.endsWith(".json")) return { format: "module", shortCircuit: true, source: `export default ${readFileSync(new URL(url), "utf8")}` };
    if (/\.tsx?$/.test(url)) return { format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText };
    return nextLoad(url, context);
  },
});
const { default: Feed } = await import("../src/components/home/RealtimeFeedSection.tsx");
const row = index => ({ id: `row-${index}`, type: "座席報告", artistName: index % 2 ? "YOASOBI" : "FRUITS ZIPPER", detail: `座席${index}`,
  venue: "札幌ドーム", date: "2026-11-15", createdAt: new Date().toISOString(), source: "real",
  href: `/events/show-${index}`, sourceUrl: `https://example.com/original-${index}`, xHandle: null });
const render = items => renderToStaticMarkup(React.createElement(Feed, { items }));

test("only three updates start visible; remaining updates and original sources stay in a closed disclosure", () => {
  const html = render(Array.from({ length: 8 }, (_, index) => row(index)));
  const visible = html.split("<details")[0];
  assert.equal([...visible.matchAll(/href="\/events\/show-/g)].length, 3);
  assert.match(visible, /YOASOBI/);
  assert.match(visible, /FRUITS ZIPPER/);
  assert.ok([...visible.matchAll(/<time /g)].length >= 3);
  assert.match(html, /残り5件を見る/);
  assert.doesNotMatch(html, /<details[^>]*\bopen/);
  for (let index = 0; index < 8; index++) {
    assert.match(html, new RegExp(`href="/events/show-${index}"`));
    assert.match(html, new RegExp(`href="https://example.com/original-${index}"`));
  }
});

test("cached examples render an honest empty state without fictitious remarks or artist groups", () => {
  const html = render([{ ...row(1), source: "sample", detail: "架空の当選コメント" }, { ...row(2), source: "editorial" }]);
  assert.match(html, /公開されている速報はまだありません/);
  assert.doesNotMatch(html, /架空の当選コメント|YOASOBIの速報/);
});
