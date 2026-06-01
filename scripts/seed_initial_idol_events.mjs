import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Initial idol event candidates.
// Important: events are one row per performance date.
// All rows below are marked \u8981\u516c\u5f0f\u78ba\u8a8d because no official confirmation URL is stored here.
// Existing NiziU rows excluded to avoid duplicates:
// - kyocera-dome / 2026-06-06 / NiziU Live with U 2026 "NiziU : THE CINEMA"
// - tokyo-dome / 2026-06-13 / NiziU Live with U 2026 "NiziU : THE CINEMA"
//
// Default behavior is dry-run only. Use --apply to upsert to Supabase.

const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

function makeEventId(venueId, date, title) {
  return crypto.createHash("sha256").update(`${venueId}::${date || ""}::${title}`).digest("hex").slice(0, 20);
}

function event({ title, venue, venueId, date, genre }) {
  return {
    id: makeEventId(venueId, date, title),
    title,
    venue,
    venue_id: venueId,
    date,
    genre,
  };
}

const EVENTS = [
  // NiziU - \u8981\u516c\u5f0f\u78ba\u8a8d
  event({
    title: "NiziU Live with U 2026 \"NiziU : THE CINEMA\"",
    venue: "\u4eac\u30bb\u30e9\u30c9\u30fc\u30e0\u5927\u962a",
    venueId: "kyocera-dome",
    date: "2026-06-07",
    genre: "female_idol",
  }),
  event({
    title: "NiziU Live with U 2026 \"NiziU : THE CINEMA\"",
    venue: "\u6771\u4eac\u30c9\u30fc\u30e0",
    venueId: "tokyo-dome",
    date: "2026-06-14",
    genre: "female_idol",
  }),

  // \u4e43\u6728\u574246 - \u8981\u516c\u5f0f\u78ba\u8a8d
  ...[
    ["\u30b5\u30f3\u30c9\u30fc\u30e0\u798f\u4e95", "sundome-fukui", "2026-06-13"],
    ["\u30b5\u30f3\u30c9\u30fc\u30e0\u798f\u4e95", "sundome-fukui", "2026-06-14"],
    ["\u6a2a\u6d5c\u30a2\u30ea\u30fc\u30ca", "yokohama-arena", "2026-06-24"],
    ["\u6a2a\u6d5c\u30a2\u30ea\u30fc\u30ca", "yokohama-arena", "2026-06-25"],
    ["\u771f\u99d2\u5185\u30bb\u30ad\u30b9\u30a4\u30cf\u30a4\u30e0\u30a2\u30a4\u30b9\u30a2\u30ea\u30fc\u30ca", "makomanai-ice-arena", "2026-07-04"],
    ["\u771f\u99d2\u5185\u30bb\u30ad\u30b9\u30a4\u30cf\u30a4\u30e0\u30a2\u30a4\u30b9\u30a2\u30ea\u30fc\u30ca", "makomanai-ice-arena", "2026-07-05"],
    ["\u5e83\u5cf6\u30b0\u30ea\u30fc\u30f3\u30a2\u30ea\u30fc\u30ca", "hiroshima-arena", "2026-07-11"],
    ["\u5e83\u5cf6\u30b0\u30ea\u30fc\u30f3\u30a2\u30ea\u30fc\u30ca", "hiroshima-arena", "2026-07-12"],
    ["\u5927\u962a\u57ce\u30db\u30fc\u30eb", "osaka-jo-hall", "2026-07-15"],
    ["\u5927\u962a\u57ce\u30db\u30fc\u30eb", "osaka-jo-hall", "2026-07-16"],
    ["\u30bb\u30ad\u30b9\u30a4\u30cf\u30a4\u30e0\u30b9\u30fc\u30d1\u30fc\u30a2\u30ea\u30fc\u30ca", "miyagi-arena", "2026-07-25"],
    ["\u30bb\u30ad\u30b9\u30a4\u30cf\u30a4\u30e0\u30b9\u30fc\u30d1\u30fc\u30a2\u30ea\u30fc\u30ca", "miyagi-arena", "2026-07-26"],
  ].map(([venue, venueId, date]) =>
    event({
      title: "\u4e43\u6728\u574246 \u771f\u590f\u306e\u5168\u56fd\u30c4\u30a2\u30fc2026",
      venue,
      venueId,
      date,
      genre: "female_idol",
    })
  ),

  // \u6afb\u574246 - \u8981\u516c\u5f0f\u78ba\u8a8d
  ...[
    ["\u30a8\u30b3\u30d1\u30a2\u30ea\u30fc\u30ca", "ecopa-arena", "2026-07-23"],
    ["\u30a8\u30b3\u30d1\u30a2\u30ea\u30fc\u30ca", "ecopa-arena", "2026-07-24"],
    ["\u795e\u6238\u30ef\u30fc\u30eb\u30c9\u8a18\u5ff5\u30db\u30fc\u30eb", "kobe-world-hall", "2026-07-28"],
    ["\u795e\u6238\u30ef\u30fc\u30eb\u30c9\u8a18\u5ff5\u30db\u30fc\u30eb", "kobe-world-hall", "2026-07-29"],
    ["\u5e83\u5cf6\u30b0\u30ea\u30fc\u30f3\u30a2\u30ea\u30fc\u30ca", "hiroshima-arena", "2026-08-08"],
    ["\u5e83\u5cf6\u30b0\u30ea\u30fc\u30f3\u30a2\u30ea\u30fc\u30ca", "hiroshima-arena", "2026-08-09"],
  ].map(([venue, venueId, date]) =>
    event({
      title: "\u6afb\u574246 \u5168\u56fd\u30a2\u30ea\u30fc\u30ca\u30c4\u30a2\u30fc2026",
      venue,
      venueId,
      date,
      genre: "female_idol",
    })
  ),

  // \uff1dLOVE - \u8981\u516c\u5f0f\u78ba\u8a8d
  ...["2026-06-20", "2026-06-21"].map((date) =>
    event({
      title: "\uff1dLOVE STADIUM LIVE\u300cBeyond \"KYUN\"\u2661\u300d",
      venue: "MUFG\u30b9\u30bf\u30b8\u30a2\u30e0",
      venueId: "mufg-stadium",
      date,
      genre: "female_idol",
    })
  ),

  // FRUITS ZIPPER - \u8981\u516c\u5f0f\u78ba\u8a8d
  ...[
    ["\u5317\u6d77\u304d\u305f\u3048\u30fc\u308b", "hokkai-kitayell", "2026-06-06"],
    ["\u5317\u6d77\u304d\u305f\u3048\u30fc\u308b", "hokkai-kitayell", "2026-06-07"],
    ["IG\u30a2\u30ea\u30fc\u30ca", "ig-arena", "2026-06-24"],
    ["IG\u30a2\u30ea\u30fc\u30ca", "ig-arena", "2026-06-25"],
  ].map(([venue, venueId, date]) =>
    event({
      title: "FRUITS ZIPPER 4TH ANNIVERSARY ARENA TOUR\u300cDREAM WITH IN\u300d",
      venue,
      venueId,
      date,
      genre: "female_idol",
    })
  ),
];

async function main() {
  const apply = process.argv.includes("--apply");

  console.log(`Initial idol event candidates: ${EVENTS.length}`);
  console.table(EVENTS.map(({ id, title, venue, venue_id, date, genre }) => ({ id, title, venue, venue_id, date, genre })));

  if (!apply) {
    console.log("Dry-run only. No DB upsert executed. Run with --apply to upsert.");
    return;
  }

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) throw new Error(`Missing env: ${key}`);
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase.from("events").upsert(EVENTS, { onConflict: "id" });
  if (error) throw error;

  console.log(`Upserted ${EVENTS.length} events.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
