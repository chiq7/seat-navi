// .env.local を読み込みprocess.envへ反映する最小限のローダ(新規npm依存を追加しないため自前実装)。
// 値そのものは絶対に返さない/ログ出力しない。呼び出し側は「読み込めたか」「何個設定したか」だけを使うこと。

import fs from "fs";
import path from "path";

export function loadEnvLocal(envPath = path.resolve(process.cwd(), ".env.local")) {
  if (!fs.existsSync(envPath)) {
    return { loaded: false, path: envPath, setCount: 0 };
  }
  const text = fs.readFileSync(envPath, "utf-8");
  let setCount = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // 既にprocess.envに設定済みの値は上書きしない(実行時の環境変数指定を優先)。
    if (!(key in process.env)) {
      process.env[key] = value;
      setCount++;
    }
  }
  return { loaded: true, path: envPath, setCount };
}
