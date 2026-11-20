/** Attach the public performance ID while keeping any selected seat and anchor intact. */
export function eventVenueHref(href: string, eventId: string): string {
  const target = new URL(href, "https://tixrepo.com");
  if (target.origin !== "https://tixrepo.com" || !/^\/venues\/[a-z0-9-]+$/.test(target.pathname)) return href;
  target.searchParams.set("fromEvent", eventId);
  return target.pathname + target.search + target.hash;
}
