export function campaignClientError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  if (error.name === "TimeoutError" || error.name === "AbortError") return "通信の応答を確認できませんでした。入力や保存済みの情報を保持しています。再読込・再試行してください。";
  if (/Failed to fetch|Load failed|NetworkError|network request failed/i.test(error.message)) return "接続できませんでした。通信状態を確認して再試行してください。";
  if (error instanceof SyntaxError) return "応答を読み取れませんでした。保存済みの情報を保持しています。再読込してください。";
  return error.message || fallback;
}
