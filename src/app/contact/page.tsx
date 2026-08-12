import type { Metadata } from "next";
import { ExternalLink, Mail } from "lucide-react";
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
        <p className="text-right text-[11px] text-[#958d93]">最終更新日：2026年7月14日</p>
        <p>お問い合わせはメール、またはちけレポ公式XのDMからご連絡ください。対象ページのURLとお問い合わせ内容をお送りください。</p>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">ご連絡いただける内容</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>投稿削除依頼</li>
            <li>権利侵害に関する連絡</li>
            <li>公演情報の修正</li>
            <li>不具合報告</li>
            <li>意見・要望</li>
          </ul>
        </section>
        <div className="space-y-2 pt-1">
          <a
            href="mailto:info@tixrepo.com"
            className="zr-focus flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[#f43679] px-4 text-[13px] font-black text-white no-underline shadow-[0_8px_20px_rgba(244,54,121,0.18)]"
          >
            <Mail size={16} />info@tixrepo.com
          </a>
          <a
            href={OFFICIAL_X_URL}
            target="_blank"
            rel="noreferrer"
            className="zr-focus flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[#ded8dc] bg-white px-4 text-[12px] font-black text-[#665a61] no-underline"
          >
            公式XのDMへ
            <ExternalLink size={15} className="text-[#f43679]" />
          </a>
        </div>
      </div>
    </StaticPage>
  );
}
