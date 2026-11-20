import { getSearchNameSuggestions, type SearchNameSuggestion } from "@/lib/searchSpellingSuggestion";
import type { SearchQuery } from "@/lib/searchQuery";
export type { SearchNameSuggestion };

/** Compatibility wrapper. The search UI uses all candidates and preserves ambiguity. */
export function getSearchNameSuggestion(query: string, hasArtistResults: boolean, parsed?: SearchQuery): SearchNameSuggestion | null {
  const results = getSearchNameSuggestions(query, parsed);
  const exactSite = results.find(result => !result.correction);
  if (exactSite) return exactSite;
  return !hasArtistResults && results.length === 1 ? results[0] : null;
}
