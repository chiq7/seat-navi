import ArtistFanBoard from "@/components/artist-page/ArtistFanBoard";

type Props = {
  artistSlug: string;
  artistName: string;
};

export default function ArtistBoardPreview({ artistSlug, artistName }: Props) {
  return (
    <section className="artist-section" id="fan-board">
      <div className="community-panel overflow-hidden">
        <div className="bg-[#fff0f5] p-5 text-[#51454c] sm:p-7">
          <p className="text-[10px] font-black tracking-[0.22em] text-[#d64175]">FAN BOARD</p>
          <h2 className="mt-3 text-[28px] font-black leading-tight tracking-[-0.045em] sm:text-[38px]">
            {artistName}を好きな人と、<br />自由に話す。
          </h2>
          <p className="mt-3 max-w-[560px] text-[12px] font-medium leading-6 text-[#7b6d75]">
            今日のライブ、座席からの景色、好きな曲。軽いひとことも写真も、同じファン同士で共有できます。
          </p>
        </div>
      </div>
      <div id="fan-board-form">
        <ArtistFanBoard artistSlug={artistSlug} artistName={artistName} />
      </div>
    </section>
  );
}
