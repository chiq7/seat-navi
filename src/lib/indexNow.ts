const SITE_URL = "https://tixrepo.com";

export const INDEXNOW_KEY = "3f8c2d6a7b1e4f509ac6d72e8b31f405";
export const INDEXNOW_KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

export type IndexNowResult = {
  submitted: number;
  status: number | null;
  error: string | null;
};

function getPublicTixRepoUrls(urls: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const rawUrl of urls) {
    try {
      const url = new URL(rawUrl, SITE_URL);
      if (url.protocol !== "https:" || url.hostname !== "tixrepo.com") continue;
      url.hash = "";
      unique.add(url.toString());
    } catch {
      // 不正なURLは通知対象から除外する。
    }
  }
  return [...unique].slice(0, 10_000);
}

export async function submitIndexNowUrls(
  urls: readonly string[],
): Promise<IndexNowResult> {
  const urlList = getPublicTixRepoUrls(urls);
  if (urlList.length === 0) return { submitted: 0, status: null, error: null };

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "tixrepo.com",
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        submitted: 0,
        status: response.status,
        error: `IndexNow returned HTTP ${response.status}`,
      };
    }
    return { submitted: urlList.length, status: response.status, error: null };
  } catch (error) {
    return {
      submitted: 0,
      status: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

