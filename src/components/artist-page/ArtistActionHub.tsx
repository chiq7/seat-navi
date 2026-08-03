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

      <div className="mt-8 grid grid-cols-2 overflow-hidden border border-[#282127] lg:grid-cols-4">
        <div className="col-span-2 grid grid-cols-10">
          <a href="#seat-map" className="zr-focus group col-span-7 flex min-h-[174px] flex-col justify-between bg-[#1c171b] p-5 text-white sm:p-7 lg:min-h-[210px]">
            <div className="flex items-start justify-between gap-3">
              <Map size={27} strokeWidth={1.7} className="shrink-0 text-[#ff5b96]" />
              <span className="text-right text-[10px] font-black tracking-[0.16em] text-white/40">01 / SEAT MAP</span>
            </div>
            <div>
              <p className="text-[28px] font-black tracking-[-0.04em] sm:text-[36px]">会場の座席表</p>
              <p className="mt-2 flex items-center gap-2 text-[11px] font-bold text-white/55">座席表・座席報告を見る <MoveRight size={16} className="transition-transform group-hover:translate-x-1" /></p>
            </div>
          </a>

          <a href="#seat-map" className="zr-focus group col-span-3 flex min-h-[174px] flex-col justify-between border-l border-[#282127] bg-[#fff0f5] p-3 text-[#1c171b] sm:p-5 lg:min-h-[210px]">
            <span className="text-[8px] font-black tracking-[0.12em] text-[#f43679]">02 / PREDICT</span>
            <div>
              <p className="text-[19px] font-black leading-[1.08] tracking-[-0.05em] sm:text-[24px]">座席<br />予想</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-[#f43679]">
                見る<MoveRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </a>
        </div>

        <a href="#ticket-data" className="zr-focus group flex min-h-[168px] flex-col justify-between border-r border-t border-[#282127] bg-white p-4 sm:p-6 lg:min-h-[210px] lg:border-l lg:border-t-0">
          <BarChart3 size={24} strokeWidth={1.7} className="text-[#f43679]" />
          <div>
            <p className="text-[20px] font-black tracking-[-0.04em] sm:text-[24px]">当落を見る</p>
            <p className="mt-2 text-[10px] font-bold leading-5 text-[#817981]">当選率・抽選傾向</p>
          </div>
        </a>

        <a href="#reports" className="zr-focus group flex min-h-[168px] flex-col justify-between border-t border-[#282127] bg-[#fff0f5] p-4 sm:p-6 lg:min-h-[210px] lg:border-t-0">
          <Camera size={24} strokeWidth={1.7} className="text-[#f43679]" />
          <div>
            <p className="text-[20px] font-black tracking-[-0.04em] sm:text-[24px]">現地を見る</p>
            <p className="mt-2 text-[10px] font-bold leading-5 text-[#817981]">見え方・演出・写真</p>
          </div>
        </a>

        <a href="#fan-board" className="zr-focus group col-span-2 flex min-h-[106px] items-center gap-4 bg-[#f43679] p-5 text-white lg:col-span-4 lg:px-7">
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
