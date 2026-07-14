/**
 * Node の --experimental-strip-types だけでは "@/..." エイリアスや拡張子省略の
 * 相対import を解決できないため、dry-run CLI (scripts/dry-run-fetch-events.mts) 専用に
 * 最小限のカスタムリゾルバを提供する。ビルド成果物には含まれない。
 *
 * 使い方 (このファイル自身を --import することで自己登録する。別ファイルへの登録は不要):
 *   node --experimental-strip-types --import ./scripts/ts-loader.mjs ./scripts/dry-run-fetch-events.mts
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

register(import.meta.url);

const projectRoot = path.resolve(import.meta.dirname, "..");

export async function resolve(specifier, context, nextResolve) {
  let spec = specifier;
  if (spec.startsWith("@/")) {
    spec = pathToFileURL(path.join(projectRoot, "src", spec.slice(2))).href;
  }
  const hasExt = /\.[a-zA-Z0-9]+$/.test(spec.split("?")[0]);
  if (!hasExt && (spec.startsWith(".") || spec.startsWith("file://"))) {
    for (const ext of [".ts", ".tsx", "/index.ts"]) {
      try {
        return await nextResolve(spec + ext, context);
      } catch {
        // 次の候補を試す
      }
    }
  }
  return nextResolve(spec, context);
}
