import Link from "next/link";

const MENU_CARD_BG: Record<"seat" | "report" | "setlist", string | null> = {
  seat:    null, // TODO: "/images/menu-seat.png"
  report:  null, // TODO: "/images/menu-report.png"
  setlist: null, // TODO: "/images/menu-setlist.png"
};

type Props = {
  slug: string;
  selectedEventId: string | undefined;
  afterHref: string;
};

export function ArtistMainMenuSection({ slug, selectedEventId, afterHref }: Props) {
  return (
    <section className="px-4 pt-3">
      <div className="mb-2.5 flex justify-center">
        <span
          className="rounded-full px-4 py-1 text-xs font-bold tracking-wide"
          style={{ background: "rgba(0,104,118,0.1)", color: "#006876" }}
        >
          メインメニュー
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">

        {/* アリーナ報告カード */}
        {selectedEventId ? (
          <Link
            href={`/events/${selectedEventId}`}
            className="relative overflow-hidden rounded-2xl border border-gray-200/70 shadow-md transition-transform active:scale-[0.97]"
            style={{ height: "96px" }}
          >
            <div
              className="absolute inset-0"
              style={
                MENU_CARD_BG.seat
                  ? { backgroundImage: `url('${MENU_CARD_BG.seat}')`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: "linear-gradient(145deg, #00545f 0%, #006876 100%)" }
              }
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-2.5">
              <p className="text-xs font-bold leading-tight text-white">アリーナ報告</p>
              <p className="text-[10px] text-white/70">見る・報告</p>
            </div>
          </Link>
        ) : (
          <div
            className="relative overflow-hidden rounded-2xl border border-gray-200/70 opacity-50 shadow-md"
            style={{ height: "96px" }}
          >
            <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, #00545f 0%, #006876 100%)" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-2.5">
              <p className="text-xs font-bold leading-tight text-white">アリーナ報告</p>
              <p className="text-[10px] text-white/70">見る・報告</p>
            </div>
          </div>
        )}

        {/* 現地レポカード */}
        <Link
          href={afterHref}
          className="relative overflow-hidden rounded-2xl border border-gray-200/70 shadow-md transition-transform active:scale-[0.97]"
          style={{ height: "96px" }}
        >
          <div
            className="absolute inset-0"
            style={
              MENU_CARD_BG.report
                ? { backgroundImage: `url('${MENU_CARD_BG.report}')`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: "linear-gradient(145deg, #005869 0%, #006876 100%)" }
            }
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-2.5">
            <p className="text-xs font-bold leading-tight text-white">現地レポ</p>
            <p className="text-[10px] text-white/70">見る・報告</p>
          </div>
        </Link>

        {/* セトリカード */}
        <Link
          href={`/artists/${slug}/setlist`}
          className="relative overflow-hidden rounded-2xl border border-gray-200/70 shadow-md transition-transform active:scale-[0.97]"
          style={{ height: "96px" }}
        >
          <div
            className="absolute inset-0"
            style={
              MENU_CARD_BG.setlist
                ? { backgroundImage: `url('${MENU_CARD_BG.setlist}')`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: "linear-gradient(145deg, #3b1fa3 0%, #5B2BE0 100%)" }
            }
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-2.5">
            <p className="text-xs font-bold leading-tight text-white">セトリ</p>
            <p className="text-[10px] text-white/70">見る・報告</p>
          </div>
        </Link>

      </div>
    </section>
  );
}
