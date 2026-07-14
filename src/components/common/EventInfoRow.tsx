import Image from "next/image";
import { parseEventTitle } from "@/lib/eventTitle";

export type EventInfoRowProps = {
  /** isTestData省略時のみ、生のevent.titleとして扱い内部でparseEventTitle()する（後方互換用）。
   * isTestDataを渡す場合は呼び出し側でparseEventTitle()済みのtourNameを渡すこと。 */
  title: string;
  artistName?: string | null;
  /** 呼び出し側でparseEventTitle()済みの場合はその結果を渡す。省略時はtitleから内部で自動判定する。 */
  isTestData?: boolean;
  /** 指定した場合のみ会場・日付を表示する */
  venue?: string | null;
  dateLabel?: string | null;
  className?: string;
};

/** ツアー名（主）＋アーティスト名（従）（＋任意で会場・日付）を表示する共通の公演情報行。 */
export function EventInfoRow({
  title,
  artistName = null,
  isTestData: isTestDataProp,
  venue = null,
  dateLabel = null,
  className,
}: EventInfoRowProps) {
  const parsed = isTestDataProp === undefined ? parseEventTitle(title, artistName) : null;
  const tourName = parsed ? parsed.tourName : title;
  const isTestData = parsed ? parsed.isTestData : isTestDataProp;

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Image
        src="/images/event-info-ticket-icon.png"
        alt=""
        width={52}
        height={52}
        className="flex-shrink-0 opacity-100"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <p className="line-clamp-2 leading-tight text-[17px] font-bold text-gray-900">
            {tourName}
          </p>
          {isTestData && (
            <span className="mt-0.5 shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold leading-none text-gray-500">
              テストデータ
            </span>
          )}
        </div>
        {artistName && (
          <p className="mt-0.5 truncate text-[13px] text-gray-500">{artistName}</p>
        )}
        {(venue || dateLabel) && (
          <p className="mt-0.5 truncate text-[11px] text-gray-400">
            {[venue, dateLabel].filter(Boolean).join(" ")}
          </p>
        )}
      </div>
    </div>
  );
}
