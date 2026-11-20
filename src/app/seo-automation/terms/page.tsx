import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/common/StaticPage";

export const metadata: Metadata = {
  title: "SEO自動集計の利用条件｜ちけレポ",
  description: "ちけレポ SEO自動集計の個人利用、データの集計制限、サービスの停止・変更について。",
  alternates: { canonical: "https://tixrepo.com/seo-automation/terms" },
  robots: { index: true, follow: true },
};

const heading = "mb-2 text-[16px] font-bold text-[#4b4148]";
const link = "font-semibold text-[#b52e64] underline underline-offset-4 hover:text-[#8c214c]";

export default function SeoAutomationTermsPage() {
  return (
    <StaticPage title="SEO自動集計の利用条件">
      <div className="space-y-7 text-[14px] leading-7 sm:text-[15px]">
        <p className="text-[12px] text-[#665a61]">最終更新日：2026年11月18日</p>
        <section>
          <h2 className={heading}>利用目的とデータの管理</h2>
          <p>このツールは、ちけレポ運営者による個人利用を目的とします。利用者は、Googleでアクセス権を持つデータだけを取得し、集計シートとスクリプトの共有範囲を自身で管理します。</p>
        </section>
        <section>
          <h2 className={heading}>集計データの制限</h2>
          <p>Google APIの集計制限、匿名化、反映の遅れ等により、明細の合計と全体の値が一致しない場合があります。Google Search ConsoleとGA4は指標の定義や日付の境界が異なります。掲載順位の変化や流入の増減だけから、施策の効果を断定しないでください。</p>
        </section>
        <section>
          <h2 className={heading}>取得・定期更新とGeminiの利用</h2>
          <p>Googleサービスの制限・仕様変更・認証状態によって、取得や定期更新が停止することがあります。Geminiによる分析結果は元データと照合して利用してください。</p>
          <p className="mt-3">データの利用と保存については、<Link href="/seo-automation/privacy" className={link}>プライバシーに関する説明</Link>をご確認ください。</p>
        </section>
        <section>
          <h2 className={heading}>管理・問い合わせ先</h2>
          <p><a href="mailto:2222color@gmail.com" className={link}>2222color@gmail.com</a></p>
        </section>
        <nav aria-label="SEO自動集計の関連ページ" className="flex flex-wrap gap-x-6 gap-y-3 border-t border-[#ded8dc] pt-5">
          <Link href="/seo-automation" className={link}>ツールの説明</Link>
          <Link href="/seo-automation/privacy" className={link}>プライバシーに関する説明</Link>
        </nav>
      </div>
    </StaticPage>
  );
}
