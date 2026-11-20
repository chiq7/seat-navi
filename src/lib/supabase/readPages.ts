const PAGE_SIZE = 500;
const MAX_ROWS = 10_000;

type Page = { data: unknown[] | null; count: number | null; error: unknown };

/** Count changes or duplicate rows prevent a paged read from being treated as complete. */
export async function readSupabasePages<T extends { id: string }>(fetchPage: (from: number, to: number) => PromiseLike<Page>, maxRows = MAX_ROWS) {
  const rows = new Map<string, T>();
  let count: number | null = null;
  let limited = false;
  for (let from = 0; from < maxRows; from += PAGE_SIZE) {
    const page = await fetchPage(from, from + PAGE_SIZE - 1);
    if (page.error) return { data: [...rows.values()], error: page.error, count, limited: true };
    if (from === 0 && page.count === null && maxRows === Infinity) return { data: [], error: null, count: null, limited: true };
    if (from === 0) count = page.count;
    else if (count !== page.count) limited = true;
    for (const row of (page.data ?? []) as T[]) rows.set(row.id, row);
    if ((page.data?.length ?? 0) < PAGE_SIZE || (count !== null && from + PAGE_SIZE >= count)) break;
  }
  limited ||= count === null || rows.size !== count;
  return { data: [...rows.values()], count, limited, error: null };
}
