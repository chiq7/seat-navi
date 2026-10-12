import ArtistFanBoard from "@/components/artist-page/ArtistFanBoard";

type Props = {
  artistSlug: string;
  artistName: string;
};

export default function ArtistBoardPreview({ artistSlug, artistName }: Props) {
  return (
    <section className="artist-section" id="fan-board">
      <p className="artist-kicker">Fan board</p>
      <h2 className="artist-heading">ファン掲示板</h2>
      <div id="fan-board-form">
        <ArtistFanBoard artistSlug={artistSlug} artistName={artistName} />
      </div>
    </section>
  );
}
