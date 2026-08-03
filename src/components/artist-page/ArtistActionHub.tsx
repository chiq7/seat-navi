import { BarChart3, Camera, Map, MessageCircle, MoveRight, WandSparkles } from "lucide-react";

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

      <div className="mt-8 grid grid-cols-2 overflow-hidden border border-[#282127] lg:grid-cols-4 lg:grid-rows-2">
        <a href="#seat-map" className="zr-focus group col-span-2 flex min-h-[136px] flex-col justify-between bg-[#1c171b] p-5 text-white sm:p-7 lg:row-span-2 lg:min-h-[280px]">
          <div className="flex items-start justify-between">
            <Map size={27} strokeWidth={1.7} className="text-[#ff5b96]" />
            <span className="text-[10px] font-black tracking-[0.16em] text-white/40">01 / SEAT MAP</span>
          </div>
          <div>
            <p className="text-[28px] font-black tracking-[-0.04em] sm:text-[36px]">会場の座席表</p>
            <p className="mt-2 flex items-center gap-2 text-[11px] font-bold text-white/55">座席報告とアリーナ予想を見る <MoveRight size={16} className="transition-transform group-hover:translate-x-1" /></p>
          </div>
        </a>

        <a href="#seat-map" className="zr-focus group flex min-h-[112px] flex-col justify-between border-r border-t border-[#282127] bg-[#fff0f5] p-4 sm:p-6 lg:border-l lg:border-t-0">
          <WandSparkles size={24} strokeWidth={1.7} className="text-[#f43679]" />
          <div>
            <p className="text-[20px] font-black tracking-[-0.04em] sm:text-[24px]">座席予想を見る</p>
            <p className="mt-2 text-[10px] font-bold leading-5 text-[#817981]">花道・ステージ構成</p>
          </div>
        </a>

        <a href="#ticket-data" className="zr-focus group flex min-h-[112px] flex-col justify-between border-t border-[#282127] bg-white p-4 sm:p-6 lg:border-t-0">
          <BarChart3 size={24} strokeWidth={1.7} className="text-[#f43679]" />
          <div>
            <p className="text-[20px] font-black tracking-[-0.04em] sm:text-[24px]">当落を見る</p>
            <p className="mt-2 text-[10px] font-bold leading-5 text-[#817981]">当選率・抽選傾向</p>
          </div>
        </a>

        <a href="#reports" className="zr-focus group flex min-h-[112px] flex-col justify-between border-r border-t border-[#282127] bg-white p-4 sm:p-6">
          <Camera size={24} strokeWidth={1.7} className="text-[#f43679]" />
          <div>
            <p className="text-[20px] font-black tracking-[-0.04em] sm:text-[24px]">現地を見る</p>
            <p className="mt-2 text-[10px] font-bold leading-5 text-[#817981]">見え方・演出・写真</p>
          </div>
        </a>

        <a href="#fan-board" className="zr-focus group flex min-h-[112px] flex-col justify-between border-t border-[#282127] bg-[#f43679] p-4 text-white sm:p-6">
          <MessageCircle size={24} strokeWidth={1.8} />
          <div>
            <p className="text-[20px] font-black tracking-[-0.03em] sm:text-[24px]">掲示板で話す</p>
            <p className="mt-2 text-[10px] font-bold leading-5 text-white/70">ファン同士で交流</p>
          </div>
        </a>
      </div>
    </section>
  );
}
