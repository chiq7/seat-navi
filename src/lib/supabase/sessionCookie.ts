export function hasSupabaseSessionCookie(
  url: string,
  cookies: { has(name: string): boolean },
): boolean {
  const projectRef = new URL(url).hostname.split(".")[0];
  const name = `sb-${projectRef}-auth-token`;
  return cookies.has(name) || cookies.has(`${name}.0`);
}
