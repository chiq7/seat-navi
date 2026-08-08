import { BarChart3, Camera, ListMusic, Map, MessageCircle, MoveRight } from "lucide-react";

type Props = {
  artistName: string;
  slug: string;
};

export default function ArtistActionHub({ artistName, slug }: Props) {
  return (
    <section className="artist-section" aria-labelledby="artist-action-title">
      <p className="artist-kicker">Fan&apos;s guide</p>
      <h2 id="artist-action-title" className="artist-heading">
        {artistName}のこと、<br />どこから見る？
      </h2>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3 lg:grid-cols-5">
        <a href="#ticket-data" className="zr-focus group flex min-h-[112px] flex-col justify-between rounded-[20px] bg-[#fff0f5] p-3.5 transition hover:-translate-y-1 sm:min-h-[150px] sm:rounded-[22px] sm:p-5">
          <BarChart3 size={22} strokeWidth={1.8} className="text-[#e94a7d]" />
          <div><p className="text-[15px] font-black tracking-[-0.04em] sm:text-[18px]">当落の傾向</p><p className="mt-1 text-[9px] font-bold text-[#a2697e] sm:text-[10px]">当選率・抽選の記録</p></div>
        </a>
        <a href="#seat-map" className="zr-focus group flex min-h-[112px] flex-col justify-between rounded-[20px] bg-[#edf0ff] p-3.5 transition hover:-translate-y-1 sm:min-h-[150px] sm:rounded-[22px] sm:p-5">
          <Map size={22} strokeWidth={1.8} className="text-[#6176d7]" />
          <div><p className="text-[15px] font-black tracking-[-0.04em] sm:text-[18px]">座席をみる</p><p className="mt-1 text-[9px] font-bold text-[#68718e] sm:text-[10px]">座席表・見え方</p></div>
        </a>
        <a href="#reports" className="zr-focus group flex min-h-[112px] flex-col justify-between rounded-[20px] bg-[#fff1ea] p-3.5 transition hover:-translate-y-1 sm:min-h-[150px] sm:rounded-[22px] sm:p-5">
          <Camera size={22} strokeWidth={1.8} className="text-[#dd8053]" />
          <div><p className="text-[15px] font-black tracking-[-0.04em] sm:text-[18px]">現地レポ</p><p className="mt-1 text-[9px] font-bold text-[#987363] sm:text-[10px]">演出・会場の雰囲気</p></div>
        </a>
        <a href={`/artists/${slug}/setlist`} className="zr-focus group flex min-h-[112px] flex-col justify-between rounded-[20px] bg-[#f4efff] p-3.5 transition hover:-translate-y-1 sm:min-h-[150px] sm:rounded-[22px] sm:p-5">
          <ListMusic size={22} strokeWidth={1.8} className="text-[#8165bb]" />
          <div><p className="text-[15px] font-black tracking-[-0.04em] sm:text-[18px]">セトリ</p><p className="mt-1 text-[9px] font-bold text-[#7c718e] sm:text-[10px]">公演ごとの曲順</p></div>
        </a>
        <a href="#fan-board" className="zr-focus group col-span-2 flex min-h-[96px] flex-row items-center justify-between rounded-[20px] bg-[#f7f4f5] p-3.5 transition hover:-translate-y-1 sm:min-h-[150px] sm:flex-col sm:items-stretch sm:rounded-[22px] sm:p-5 lg:col-span-1">
          <MessageCircle size={22} strokeWidth={1.8} className="text-[#665761]" />
          <div className="flex items-end justify-between gap-2"><div><p className="text-[15px] font-black tracking-[-0.04em] sm:text-[18px]">ファン掲示板</p><p className="mt-1 text-[9px] font-bold text-[#887982] sm:text-[10px]">みんなと話す</p></div><MoveRight size={17} className="mb-1 shrink-0 text-[#887982]" /></div>
        </a>
      </div>
    </section>
  );
}
