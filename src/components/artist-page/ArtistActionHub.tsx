import { MoveRight } from "lucide-react";

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

      <div className="mt-8 grid grid-cols-2 overflow-hidden border border-[#282127] lg:grid-cols-4">
        <a href="#seat-map" className="zr-focus group col-span-2 flex min-h-[150px] flex-col justify-between bg-[#1c171b] p-5 text-white sm:p-7 lg:min-h-[190px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[9px] font-black tracking-[0.2em] text-[#ff5b96]">01 / SEAT MAP</span>
            <span className="h-px w-10 bg-white/20" />
          </div>
          <div>
            <p className="text-[28px] font-black tracking-[-0.045em] sm:text-[36px]">会場の座席表</p>
            <p className="mt-2 flex items-center gap-2 text-[11px] font-bold text-white/55">
              座席表・座席報告を見る
              <MoveRight size={16} className="transition-transform group-hover:translate-x-1" />
            </p>
          </div>
        </a>

        <a href="#seat-map" className="zr-focus group col-span-2 flex min-h-[84px] items-center bg-[#fff0f5] p-4 text-[#1c171b] lg:min-h-[190px] lg:border-l lg:border-[#282127] lg:p-7">
          <div className="flex w-full items-center justify-between gap-4 lg:h-full lg:flex-col lg:items-start">
            <div>
              <span className="text-[9px] font-black tracking-[0.18em] text-[#f43679]">02 / PREDICTION</span>
              <p className="mt-1 text-[20px] font-black tracking-[-0.04em] sm:text-[25px] lg:mt-5 lg:text-[32px]">座席予想</p>
              <p className="mt-1 text-[10px] font-bold text-[#817981] lg:mt-2">花道・ステージ構成</p>
            </div>
            <MoveRight size={19} className="shrink-0 text-[#f43679] transition-transform group-hover:translate-x-1" />
          </div>
        </a>

        <a href="#ticket-data" className="zr-focus group flex min-h-[120px] flex-col justify-between border-r border-t border-[#282127] bg-white p-4 sm:p-5 lg:min-h-[160px]">
          <span className="text-[9px] font-black tracking-[0.18em] text-[#f43679]">03 / TICKET</span>
          <div>
            <p className="text-[20px] font-black tracking-[-0.04em] sm:text-[24px]">当落を見る</p>
            <p className="mt-2 text-[10px] font-bold leading-5 text-[#817981]">当選率・抽選傾向</p>
          </div>
        </a>

        <a href="#reports" className="zr-focus group flex min-h-[120px] flex-col justify-between border-t border-[#282127] bg-[#fff8fa] p-4 sm:p-5 lg:min-h-[160px] lg:border-r">
          <span className="text-[9px] font-black tracking-[0.18em] text-[#f43679]">04 / REPORTS</span>
          <div>
            <p className="text-[20px] font-black tracking-[-0.04em] sm:text-[24px]">現地を見る</p>
            <p className="mt-2 text-[10px] font-bold leading-5 text-[#817981]">見え方・演出・写真</p>
          </div>
        </a>

        <a href="#fan-board" className="zr-focus group col-span-2 flex min-h-[84px] items-center justify-between gap-5 border-t border-[#282127] bg-[#f43679] p-5 text-white lg:min-h-[160px] lg:flex-col lg:items-start lg:p-7">
          <span className="text-[9px] font-black tracking-[0.18em] text-white/65">05 / COMMUNITY</span>
          <div className="flex w-full items-center justify-between gap-4">
            <p className="text-[20px] font-black tracking-[-0.035em] sm:text-[25px]">ファン掲示板で話す</p>
            <MoveRight size={21} className="shrink-0 transition-transform group-hover:translate-x-1" />
          </div>
        </a>
      </div>
    </section>
  );
}
