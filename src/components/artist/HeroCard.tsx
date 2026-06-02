const HERO_BG = "/images/concert-hero.png";

type TourInfo = {
  fullTitle: string;
  dateRange: string | null;
  summary: string | null;
};

export function HeroCard({ tourInfo, artistName }: { tourInfo: TourInfo; artistName: string }) {
  return (
    <section className="mx-4 mt-3">
      <div
        className="relative h-[148px] overflow-hidden rounded-2xl"
        style={{
          backgroundImage: `url('${HERO_BG}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#0a0e1a",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 75% 55% at 38% 28%, rgba(0,104,118,0.52) 0%, transparent 52%),
              radial-gradient(ellipse 52% 40% at 72% 18%, rgba(6,182,212,0.38) 0%, transparent 44%),
              linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)
            `,
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-end px-4 pb-4">
          <span className="mb-1.5 w-fit rounded-full border border-white/40 bg-white/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
            Live Announcement
          </span>
          <h2
            className="text-[14px] font-bold leading-snug text-white"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
          >
            {tourInfo.fullTitle || artistName}
          </h2>
          {tourInfo.dateRange && (
            <p className="mt-1 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-white/70">
              <span>{tourInfo.dateRange}</span>
              {tourInfo.summary && (
                <>
                  <span className="text-white/40">|</span>
                  <span>{tourInfo.summary}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
