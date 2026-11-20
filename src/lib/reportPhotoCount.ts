import type { AfterReportCard } from "./artistPageTypes";

/** ReportTimelineList renders only the first attached seat image on each card. */
export function countReportCardPhotos(reports: readonly Pick<AfterReportCard, "seat_view_photo_paths">[]): number {
  const paths = new Set<string>();
  for (const report of reports) {
    const path = report.seat_view_photo_paths?.[0];
    if (path) paths.add(path);
  }
  return paths.size;
}
