import { buildFileImageMetadata } from "@/lib/fileImageMetadata";
import Link from "next/link";
import { CheckCircle2, Search, Ticket, MapPinned, MessageSquareText, Music2 } from "lucide-react";
import { NewsArticleLayout } from "@/components/news/NewsArticleLayout";

export const metadata = buildFileImageMetadata({
  path: "/news/how-to-use-tixrepo",
  title: "ちけレポでできること｜当落・座席・現地レポの使い方",
  description: "ちけレポでできることを紹介します。公演の探し方、当落・座席報告、現地レポ、セトリの確認方法をまとめました。",
  robots: { index: true, follow: true },
  ogType: "article",
});

const features = [
  {
    icon: <Search size={19} />,
    title: "公演を探す",
    href: "/search",
    text: "アーティスト名や公演名から検索できます。アーティストページでは、開催予定・過去の公演を日付順で確認できます。",
  },
  {
    icon: <Ticket size={19} />,
    title: "当落結果を報告・確認する",
    href: "/report/ticket",
    text: "当選・落選、申込区分などの報告を集め、公演ごとの当選傾向を見やすくします。",
  },
  {
    icon: <MapPinned size={19} />,
    title: "会場の座席写真を見る",
    href: "/venues#seat-photos",
    text: "会場を選び、地図の印を押すと写真が開きます。公演ページでは、その日の座席報告と配置予想を確認できます。",
  },
  {
    icon: <MessageSquareText size={19} />,
    title: "現地レポを読む・投稿する",
    href: "/search?q=%E7%8F%BE%E5%9C%B0%E3%83%AC%E3%83%9D",
    text: "会場で分かったことや参加時の感想を、現地レポとして共有できます。",
  },
  {
    icon: <Music2 size={19} />,
    title: "セトリを確認する",
    href: "/search?q=%E3%82%BB%E3%83%88%E3%83%AA",
    text: "公演ごとに追加されたセットリストを確認できます。未登録の場合は、参加者が追加できます。",
  },
];

export default function HowToUseTixRepoPage() {
  return (
    <NewsArticleLayout kicker="使い方" title="ちけレポでできること" lead="公演を探す。座席表から席の位置と写真を見る。参加した体験を共有する。">
      <div className="border-t border-divider bg-white">
          <section className="border-b border-[#ded8dc] p-5 sm:p-7">
            <h2 className="text-[16px] font-bold text-gray-900">使い方はシンプルです</h2>
            <ol className="mt-3 space-y-2.5 text-[13px] leading-6 text-gray-700">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center bg-[#f43679] text-[11px] font-black text-white">1</span><Link href="/search" className="underline underline-offset-4">参加する公演を探す</Link></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center bg-[#f43679] text-[11px] font-black text-white">2</span><Link href="/venues#seat-photos" className="underline underline-offset-4">会場の座席写真を見る</Link></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center bg-[#f43679] text-[11px] font-black text-white">3</span><Link href="/report" className="underline underline-offset-4">自分の席や体験を投稿する</Link></li>
            </ol>
          </section>

          <section className="border-b border-[#ded8dc] p-5 sm:p-7">
            <h2 className="text-[16px] font-bold text-gray-900">主な機能</h2>
            <div className="mt-3 divide-y divide-[#ded8dc]">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="mt-0.5 shrink-0 text-[#FF6B9D]" aria-hidden="true">{feature.icon}</div>
                  <div>
                    <h3 className="text-[14px] font-bold text-gray-900"><Link href={feature.href} className="zr-focus inline-flex min-h-11 items-center text-[#a62b59] underline underline-offset-4">{feature.title}</Link></h3>
                    <p className="mt-1 text-[13px] leading-6 text-gray-600">{feature.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#fff0f5] p-5 sm:p-7">
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-gray-900"><CheckCircle2 size={18} className="text-[#FF6B9D]" aria-hidden="true" />正確な情報共有にご協力ください</h2>
            <p className="mt-2 text-[13px] leading-7 text-gray-700">
              投稿は、ご自身で確認できた内容を中心にお願いします。公演や座席の状況は変わることがあるため、公式案内もあわせてご確認ください。
            </p>
            <Link href="/search" className="zr-focus mt-4 flex min-h-12 items-center justify-center bg-[#f43679] px-4 py-2.5 text-[13px] font-black text-white no-underline">
              アーティスト・公演を探す
            </Link>
          </section>
      </div>
    </NewsArticleLayout>
  );
}
