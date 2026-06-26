import {
  Noto_Sans_JP,
  Zen_Kaku_Gothic_New,
  M_PLUS_Rounded_1c,
  M_PLUS_1p,
  Zen_Maru_Gothic,
} from "next/font/google";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const mPlusRounded1c = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const mPlus1p = M_PLUS_1p({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const zenMaruGothic = Zen_Maru_Gothic({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const FONTS = [
  { label: "1. Noto Sans JP", cls: notoSansJP.className },
  { label: "2. Zen Kaku Gothic New", cls: zenKakuGothicNew.className },
  { label: "3. M PLUS Rounded 1c", cls: mPlusRounded1c.className },
  { label: "4. M PLUS 1p", cls: mPlus1p.className },
  { label: "5. Zen Maru Gothic", cls: zenMaruGothic.className },
];

const REPORT_ITEMS = [
  "当落・座席を報告",
  "アリーナ予想図を投稿",
  "現地レポを投稿",
  "セトリを投稿",
];

function FontCard({ label, fontClass }: { label: string; fontClass: string }) {
  return (
    <div className={`${fontClass} mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm`}>
      {/* フォント名バッジ */}
      <div className="bg-[#FFF0F5] px-4 py-2 text-center">
        <span className="text-[13px] font-bold text-[#FF6B9D]">{label}</span>
      </div>

      <div className="px-4 pb-5 pt-4">
        {/* ページタイトル */}
        <p className="mb-4 text-center text-[17px] font-bold tracking-[0.02em] text-[#111827]">
          報告する
        </p>

        {/* ヒーローコピー */}
        <div className="text-center">
          <p className="text-[22px] font-bold leading-[1.45] text-[#111827]">
            あなたの報告が、
            <br />
            次の参戦の<span className="text-[#FF6B9D]">ヒント</span>になる
          </p>
          <p className="mt-2 text-[13px] text-[#374151]">
            当落・座席・現地の様子をみんなで共有しよう
          </p>
        </div>

        {/* ライブ情報カード */}
        <div className="mx-4 my-4 rounded-[16px] border border-gray-100 bg-gray-50/80 py-3 text-center">
          <p className="text-[12px] font-semibold tracking-[0.06em] text-[#FF6B9D]">NiziU</p>
          <p className="mt-0.5 text-[14px] font-bold text-[#111827]">NiziU Live Tour 2026</p>
          <p className="mt-0.5 text-[11px] text-[#6B7280]">2026.07.12 - 2026.09.28</p>
        </div>

        {/* 報告カード見出し */}
        <div className="space-y-2">
          {REPORT_ITEMS.map((item) => (
            <div
              key={item}
              className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5"
            >
              <p className="text-[14px] font-bold text-[#111827]">{item}</p>
              <span className="text-[11px] text-[#D1D5DB]">›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FontPreviewPage() {
  return (
    <main className="mx-auto min-h-screen max-w-[390px] bg-[#F9FAFB] px-4 py-6">
      <h1 className="mb-1 text-center text-[20px] font-bold text-[#111827]">フォント比較</h1>
      <p className="mb-6 text-center text-[12px] text-[#6B7280]">報告ページのフォント選定用</p>
      {FONTS.map((f) => (
        <FontCard key={f.label} label={f.label} fontClass={f.cls} />
      ))}
    </main>
  );
}
