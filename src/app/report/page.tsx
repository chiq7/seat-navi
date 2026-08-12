import { ReportEntryClient } from "./ReportEntryClient";

type SearchParams = {
  event?: string | string[];
  artist?: string | string[];
};

function firstValue(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

/** URL待ちでページ全体を空にせず、報告カードを最初のHTMLから表示する。 */
export default async function ReportEntryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <ReportEntryClient
      initialEventId={firstValue(params.event)}
      initialArtistSlug={firstValue(params.artist)}
    />
  );
}
