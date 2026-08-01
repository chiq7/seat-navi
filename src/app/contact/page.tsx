import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import StaticPage from "@/components/common/StaticPage";

export const metadata: Metadata = {
  title: "お問い合わせ｜ちけレポ",
  description: "ちけレポへのお問い合わせ方法です。",
  alternates: { canonical: "https://tixrepo.com/contact" },
  robots: { index: true, follow: true },
};

const OFFICIAL_X_URL = "https://x.com/tixrepo";

export default function ContactPage() {
  return (
    <StaticPage title="お問い合わせ">
      <div className="space-y-5">
        <p className="text-right text-[11px] text-gray-400">最終更新日：2026年7月14日</p>
        <p>お問い合わせは、ちけレポ公式XのDMからご連絡ください。対象ページのURLとお問い合わせ内容をお送りください。</p>
        <section>
          <h2 className="text-[15px] font-bold text-gray-900">ご連絡いただける内容</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>投稿削除依頼</li>
            <li>権利侵害に関する連絡</li>
            <li>公演情報の修正</li>
            <li>不具合報告</li>
            <li>意見・要望</li>
          </ul>
        </section>
        <a
          href={OFFICIAL_X_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg bg-[#FF6B9D] px-4 py-3 text-[13px] font-bold text-white no-underline"
        >
          公式Xへ
          <ExternalLink size={15} />
        </a>
      </div>
    </StaticPage>
  );
}
