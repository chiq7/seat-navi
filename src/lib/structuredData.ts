const SITE_URL = "https://tixrepo.com";

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function buildSiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "ちけレポ",
        alternateName: "TixRepo",
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "ちけレポ",
        alternateName: "TixRepo",
        inLanguage: "ja",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}

export type EventStructuredDataInput = {
  id: string;
  name: string;
  description: string;
  startDate: string | null;
  venue: string;
  venueId: string | null;
  artistName: string | null;
  artistSlug: string | null;
};

export function buildEventStructuredData(input: EventStructuredDataInput) {
  const eventUrl = `${SITE_URL}/events/${input.id}`;
  const event = {
    "@type": "Event",
    "@id": `${eventUrl}#event`,
    name: input.name,
    description: input.description,
    url: eventUrl,
    image: [`${SITE_URL}/api/og/event/${input.id}`],
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(input.startDate ? { startDate: input.startDate } : {}),
    location: {
      "@type": "Place",
      name: input.venue,
      ...(input.venueId ? { url: `${SITE_URL}/venues/${input.venueId}` } : {}),
    },
    ...(input.artistName
      ? {
          performer: {
            "@type": "MusicGroup",
            name: input.artistName,
            ...(input.artistSlug ? { url: `${SITE_URL}/artists/${input.artistSlug}` } : {}),
          },
        }
      : {}),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      event,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ちけレポ", item: SITE_URL },
          ...(input.artistName && input.artistSlug
            ? [{
                "@type": "ListItem",
                position: 2,
                name: input.artistName,
                item: `${SITE_URL}/artists/${input.artistSlug}`,
              }]
            : []),
          {
            "@type": "ListItem",
            position: input.artistName && input.artistSlug ? 3 : 2,
            name: input.name,
            item: eventUrl,
          },
        ],
      },
    ],
  };
}
