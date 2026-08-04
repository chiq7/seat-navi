import { BarChart3, Camera, Map, MessageCircle, MoveRight } from "lucide-react";

type Props = {
  artistName: string;
};

export default function ArtistActionHub({ artistName }: Props) {
  return (
    <section className="artist-section" aria-labelledby="artist-action-title">
      <p className="artist-kicker">Choose Your View</p>
      <h2 id="artist-action-title" className="artist-heading">
        {artistName}を、<br />どこから見る？
      </h2>

      <div className="mt-6 grid grid-cols-2 overflow-hidden border border-[#282127] lg:grid-cols-4">
        <a href="#seat-map" className="zr-focus group col-span-2 flex min-h-[165px] flex-col justify-between bg-[#1c171b] p-4 text-white sm:p-6 lg:min-h-[190px]">
          <div className="flex items-start justify-between">
            <Map size={27} strokeWidth={1.7} className="text-[#ff5b96]" />
            <span className="text-[10px] font-black tracking-[0.16em] text-white/40">01 / SEAT MAP</span>
          </div>
          <div>
            <p className="text-[26px] font-black tracking-[-0.04em] sm:text-[34px]">会場の座席表</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-bold text-white/55">座席表・座席報告</span>
              <span className="inline-flex min-h-9 items-center gap-2 border border-[#ff5b96] px-3 text-[10px] font-black text-[#ff5b96] transition-colors group-hover:bg-[#ff5b96] group-hover:text-white">
                座席予想を見る
                <MoveRight size={15} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </a>

        <a href="#ticket-data" className="zr-focus group flex min-h-[132px] flex-col justify-between border-r border-t border-[#282127] bg-white p-4 sm:p-5 lg:min-h-[190px] lg:border-l lg:border-t-0">
          <BarChart3 size={24} strokeWidth={1.7} className="text-[#f43679]" />
          <div>
            <p className="text-[18px] font-black leading-tight tracking-[-0.04em] sm:text-[24px]">当落結果・<br />傾向を見る</p>
            <p className="mt-2 text-[10px] font-bold leading-5 text-[#817981]">当選率・抽選傾向</p>
          </div>
        </a>

        <a href="#reports" className="zr-focus group flex min-h-[132px] flex-col justify-between border-t border-[#282127] bg-[#fff0f5] p-4 sm:p-5 lg:min-h-[190px] lg:border-t-0">
          <Camera size={24} strokeWidth={1.7} className="text-[#f43679]" />
          <div>
            <p className="text-[20px] font-black tracking-[-0.04em] sm:text-[24px]">現地を見る</p>
            <p className="mt-2 text-[10px] font-bold leading-5 text-[#817981]">見え方・演出・写真</p>
          </div>
        </a>

        <a href="#fan-board" className="zr-focus group col-span-2 flex min-h-[84px] items-center gap-4 bg-[#f43679] p-4 text-white lg:col-span-4 lg:px-6">
          <MessageCircle size={27} strokeWidth={1.8} />
          <div className="min-w-0 flex-1">
            <p className="text-[20px] font-black tracking-[-0.03em]">ファン掲示板で話す</p>
          </div>
          <MoveRight size={21} className="shrink-0 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </section>
  );
}
