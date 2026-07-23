/**
 * Identity normalization shared by every official-news database writer.
 *
 * It intentionally preserves query strings and fragments: some legacy official sites use a
 * fragment as the article identifier. The SQL function in migration 031 implements the same
 * operations in the same order.
 */
export function normalizeOfficialNewsUrl(rawUrl) {
  const trimmed = String(rawUrl).trim();
  const match = /^(https?:\/\/[^/?#]+)(.*)$/i.exec(trimmed);
  const normalizedAuthority = match ? `${match[1].toLowerCase()}${match[2]}` : trimmed;
  return normalizedAuthority.replace(/\/$/, "");
}
