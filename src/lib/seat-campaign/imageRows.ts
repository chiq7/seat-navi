import { rowText, type CampaignRow } from "./model";

export const imageTextUnits = (text: string) => Array.from(text).reduce((n, char) => n + (/[ -~]/.test(char) ? 1 : 2), 0);
export function wrapImageLine(text: string, maxUnits = 66): string[] {
  const lines: string[] = []; let line = "", units = 0;
  for (const char of text) {
    const size = imageTextUnits(char);
    if (units + size > maxUnits) { lines.push(line); line = ""; units = 0; }
    line += char; units += size;
  }
  if (line) lines.push(line);
  return lines;
}
// Split long lists into more image rows, repeating the block/row identity.
// Never omit a reported number or replace a sparse list with a continuous range.
export function campaignImageRows(rows: CampaignRow[]): string[][] {
  const result: string[][] = [];
  for (const row of rows) {
    let numbers: string[] = [];
    for (const number of row.numbers) {
      const next = [...numbers, number];
      if (numbers.length && imageTextUnits(rowText({ ...row, numbers: next })) > 120) {
        result.push(wrapImageLine(rowText({ ...row, numbers })));
        numbers = [];
      }
      numbers.push(number);
    }
    if (numbers.length) result.push(wrapImageLine(rowText({ ...row, numbers })));
  }
  return result;
}
