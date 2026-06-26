import { ChevronLeft, Heart } from "lucide-react";

export default function ArtistHeader() {
  return (
    <header className="flex h-16 items-center justify-between bg-white px-4">
      <button
        type="button"
        aria-label="戻る"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(17,24,39,0.14)]"
      >
        <ChevronLeft size={28} strokeWidth={2.7} className="text-gray-900" />
      </button>
      <h1 className="text-[21px] font-bold tracking-normal text-gray-900">NiziU</h1>
      <button
        type="button"
        aria-label="お気に入り"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eeeeee] bg-white shadow-[0_1px_5px_rgba(17,24,39,0.05)]"
      >
        <Heart size={24} strokeWidth={2.4} className="text-gray-900" />
      </button>
    </header>
  );
}
