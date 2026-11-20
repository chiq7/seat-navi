/** Shared validation for build artifacts and fresh anonymous SSR documents. */
export function validPublicGuideSnapshot(path: string, source: string, flight: boolean): boolean {
  if (path === "/") {
    if (flight) return source.startsWith("0:") && source.includes('"data-home-program-day"') && source.includes('"id":"upcoming-events"') && !/(?:^|\n)[\da-f]+:E\{/.test(source);
    const html = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    return /rel="canonical" href="https:\/\/tixrepo\.com\/?"/.test(html) && html.includes('data-home-program-day="') &&
      html.includes('id="upcoming-events"') && /<\/html>\s*$/.test(html) && !/<template\b[^>]*data-dgst=/.test(html);
  }
  const venue = /^\/venues\/[a-z0-9-]+$/.test(path);
  if (!venue && !/^\/artists\/[a-z0-9-]+$/.test(path)) return false;
  const canonical = "https://tixrepo.com" + path;
  if (source.includes("会場ガイドを読み込めませんでした") || source.includes("公演一覧を読み込めませんでした")
      || /(?:^|\n)[\da-f]+:E\{/.test(source)) return false;
  if (flight) {
    return source.startsWith("0:") && source.includes('"__route":"route:' + path + '"')
      && source.includes('rel="canonical" href="' + canonical + '"')
      && (venue ? source.includes('"id":"seat-reading-title"') && source.includes('"data-published-photos"')
        : source.includes('"initialEvents":') && source.includes(canonical + "#artist"));
  }
  const head = source.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  if (!head || !head.includes('rel="canonical" href="' + canonical + '"')
      || !/<title>[^<]+<\/title>/i.test(head) || !/<meta\s+name="description"\s+content="[^"]+"/i.test(head)) return false;
  // Flight bootstrap scripts can contain a complete second copy of a partially failed page.
  const visible = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  if (!/<h1(?:\s|>)/i.test(visible) || !/<\/html>\s*$/i.test(source)
      || /<template\b[^>]*data-dgst=/.test(visible) || !source.includes(canonical + (venue ? "#place" : "#artist"))) return false;
  if (!venue) return ["ticket-data", "fan-board"].every(id =>
    visible.includes(`id="${id}"`) && visible.includes(`href="#${id}"`));
  const count = visible.match(/\bdata-published-photos="(\d+)"/)?.[1];
  return count !== undefined && visible.includes('id="seat-reading-title"') && visible.includes('id="seat-photo-title"')
    && visible.includes('id="venue-seat-guide"') && (count === "0"
      ? visible.includes("この会場の座席写真はまだありません。")
      : visible.includes('id="seat-photo-inventory"'));
}
