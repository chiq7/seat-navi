// A data-review gate, not an inferred list of blocks from incoming submissions.
// Add an event only after independently verifying its block layout and source.
// The existing ArenaReportMap uses an A-H reference grid. Do not register a layout
// unless that grid's block arrangement has also been reviewed against the source.
export const VERIFIED_CAMPAIGN_LAYOUTS: Readonly<Record<string, { sourceUrl: string; referenceGridReviewed: true; blocks: readonly string[] }>> = {};
