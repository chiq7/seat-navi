import { ImagePlus, MessageCircleMore, ShieldCheck } from "lucide-react";
import ArtistFanBoard from "@/components/artist-page/ArtistFanBoard";

type Props = {
  artistSlug: string;
  artistName: string;
};

export default function ArtistBoardPreview({ artistSlug, artistName }: Props) {
  return (
    <section className="artist-section" id="fan-board">
      <div className="grid overflow-hidden border border-[#282127] md:grid-cols-[1.15fr_.85fr]">
        <div className="bg-[#1c171b] p-6 text-white sm:p-9">
          <p className="text-[10px] font-black tracking-[0.22em] text-[#ff5b96]">FAN BOARD</p>
          <h2 className="mt-4 text-[30px] font-black leading-tight tracking-[-0.045em] sm:text-[42px]">
            {artistName}を好きな人と、<br />自由に話す。
          </h2>
          <p className="mt-5 max-w-[560px] text-[12px] font-medium leading-6 text-white/58">
            今日のライブ、座席からの景色、好きな曲。軽いひとことも写真も、同じファン同士で共有できます。
          </p>
        </div>
        <div className="flex flex-col justify-between bg-[#fff0f5] p-6 sm:p-9">
          <div className="space-y-4 text-[12px] font-bold text-[#40383e]">
            <p className="flex items-center gap-3"><MessageCircleMore size={19} className="text-[#f43679]" />ログインなしで書き込み</p>
            <p className="flex items-center gap-3"><ImagePlus size={19} className="text-[#f43679]" />写真は1投稿につき2枚まで</p>
            <p className="flex items-center gap-3"><ShieldCheck size={19} className="text-[#f43679]" />通報・管理者削除に対応</p>
          </div>
          <a href="#fan-board-form" className="zr-focus mt-8 inline-flex min-h-12 w-full items-center justify-center bg-[#f43679] px-5 text-[12px] font-black text-white">
            書き込む
          </a>
        </div>
      </div>
      <div id="fan-board-form">
        <ArtistFanBoard artistSlug={artistSlug} artistName={artistName} />
      </div>
    </section>
  );
}
