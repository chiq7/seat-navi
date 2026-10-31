const sources = ["home_hero", "home_shortcut", "home_directory", "venue_jump", "venue_event", "venue_artist"] as const;
const destinations = ["directory", "venue", "event", "artist", "section"] as const;

export type DiscoveryContext = {
  source: typeof sources[number];
  destination: typeof destinations[number];
  destinationId: string;
  venueId?: string;
};

// Track only controlled identifiers, never titles, entered text, or URL queries.
export function discoveryClickParams(context: DiscoveryContext) {
  const safeId = (value: string) => /^[a-zA-Z0-9_-]{1,100}$/.test(value);
  if (!sources.includes(context.source) || !destinations.includes(context.destination)
    || !safeId(context.destinationId) || (context.venueId !== undefined && !safeId(context.venueId))) return null;
  return {
    link_source: context.source,
    destination_type: context.destination,
    destination_id: context.destinationId,
    ...(context.venueId ? { venue_id: context.venueId } : {}),
  };
}
