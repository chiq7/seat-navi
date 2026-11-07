import { Header } from "@/components/common/Header";
import { buildMeta } from "@/lib/metadata";
import { venueSeatSectionHref, ZOZO_LOWER_THIRD_PAGE, ZOZO_LOWER_THIRD_TARGET } from "@/lib/venueSeatLinks";
import LowerThirdSeatMap from "./LowerThirdSeatMap";

const title = "ZOZOマリンスタジアム 下段3塁側の座席表";
const description = "ZOZOマリンスタジアムの下段3塁側を拡大した座席表。常設スタンドの位置や、資料で確認できた列・番号を図から探せます。";

export const metadata = buildMeta({ path: ZOZO_LOWER_THIRD_PAGE, title: `${title}｜ちけレポ`, description });

export default function LowerThirdBasePage() {
  return <main className="community-page pb-16">
    <Header title="ZOZOマリンスタジアム" backHref="/venues/zozo-marine#venue-seat-guide" backLabel="会場の座席表へ戻る" />
    <div className="zr-container py-6">
      <h1 className="artist-heading">{title}</h1>
      <p className="mb-4 mt-3 text-sm leading-7">下段3塁側は、内野の3塁側にある常設スタンドの下段です。図では下段3塁側を拡大して表示しています。区画をタップすると、確認済みの列・番号の情報を見られます。</p>
      <LowerThirdSeatMap />
      <p className="mt-4 text-sm leading-7">列・番号は資料で確認できた範囲を掲載しています。ライブで使う席やステージの位置は、公演ごとの案内をご確認ください。</p>
      <div className="mt-3 flex flex-wrap gap-x-5 text-sm font-bold text-[#a62b59]">
        <a className="zr-focus inline-flex min-h-11 items-center underline" href={venueSeatSectionHref("zozo-marine", ZOZO_LOWER_THIRD_TARGET)}>会場ガイドで下段3塁側を開く</a>
        <a className="zr-focus inline-flex min-h-11 items-center underline" href="https://www.marines.co.jp/stadium/ballpark/guidemap.html">マリーンズ公式の球場案内</a>
      </div>
    </div>
  </main>;
}
