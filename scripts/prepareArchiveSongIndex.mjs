import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export function prepareArchiveSongIndex(root = process.cwd()) {
  const load = file => JSON.parse(readFileSync(resolve(root, file), "utf8"));
  const counts = load("src/lib/artistSetlistArchiveCounts.json");
  const previews = {};
  const withSongs = Object.keys(counts).sort().filter(slug => {
    const rows = load("public/_tixrepo/setlist-archive/" + slug + ".json");
    if (rows.length !== counts[slug]) throw new Error("Archive count mismatch: " + slug);
    // Linked entries show songs from the live setlists table. Only unlinked entries render archived songs.
    const published = rows.filter(row => !row.eventId && row.songs?.some(song => typeof song === "string" && song.trim()));
    // Small archives can be browsed without JS. For long archives, ship only one song list with the page.
    previews[slug] = rows.length <= 5 ? rows : (published.length ? published : rows).slice(0, 1);
    return published.length > 0;
  });
  for (const [file, data] of [["archiveArtistsWithSongs.json", withSongs], ["artistSetlistArchivePreviews.json", previews]]) {
    const target = resolve(root, "src/lib/" + file);
    const value = JSON.stringify(data) + "\n";
    let old;
    try { old = readFileSync(target, "utf8"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    if (value !== old) writeFileSync(target, value);
  }
}
