export const PUBLIC_DATA_TIMEOUT_MS = 8000;

type PublicDataRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

/** A fresh controller per attempt lets the next poll recover after a stalled request. */
export async function fetchFreshPublicData<T>(endpoint: string, {
  signal, timeoutMs = PUBLIC_DATA_TIMEOUT_MS, fetcher = fetch,
}: PublicDataRequestOptions = {}) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    cancel = () => {
      controller.abort();
      reject(new DOMException("Public data request cancelled", "AbortError"));
    };
    signal?.addEventListener("abort", cancel, { once: true });
    timer = setTimeout(() => {
      controller.abort();
      reject(new DOMException("Public data request timed out", "TimeoutError"));
    }, timeoutMs);
  });
  if (signal?.aborted) cancel();
  try {
    return await Promise.race([
      interrupted,
      (async () => {
        const response = await fetcher(endpoint, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Public data request failed");
        const data = await response.json() as T;
        const headerTime = response.headers.get("X-Tixrepo-Data-Updated-At");
        const updatedAt = headerTime && Number.isFinite(Date.parse(headerTime)) ? headerTime : null;
        return {
          data,
          updatedAt,
          staleAt: response.headers.get("X-Tixrepo-Data-Stale") === "1" ? updatedAt : null,
          checkedAt: new Date().toISOString(),
        };
      })(),
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
