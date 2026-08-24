import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-[#eadfe4] bg-[#f8f1f5] text-[#51454c]">
      <div className="zr-container grid gap-4 pb-[calc(76px+env(safe-area-inset-bottom))] pt-8 md:grid-cols-[1fr_auto] md:items-end md:gap-x-7 md:gap-y-5 md:pb-11 md:pt-11">
        <div>
          <Link href="/" className="zr-focus inline-flex rounded-md p-1" aria-label="ちけレポ トップへ">
            <Image src="/images/logo.png" alt="" width={144} height={36} className="h-8 w-auto" />
          </Link>
          <p className="mt-3 max-w-[520px] text-[11px] leading-5 text-[#81747c] md:mt-4 md:text-[12px] md:leading-6">ライブの当落、座席表、会場の見え方、現地の熱をファン同士で共有するライブ情報コミュニティ。</p>
        </div>
        <div className="flex flex-wrap gap-x-4 text-[10px] font-bold text-[#6f626a] md:justify-end md:gap-x-5 md:text-[11px]">
          <Link href="/terms" className="inline-flex min-h-10 items-center hover:text-[#e94a7d] md:min-h-11">
            利用規約
          </Link>
          <Link href="/privacy" className="inline-flex min-h-10 items-center hover:text-[#e94a7d] md:min-h-11">
            プライバシーポリシー
          </Link>
          <Link href="/contact" className="inline-flex min-h-10 items-center hover:text-[#e94a7d] md:min-h-11">
            お問い合わせ
          </Link>
          <Link href="/venues" className="inline-flex min-h-10 items-center hover:text-[#e94a7d] md:min-h-11">
            ライブ会場一覧
          </Link>
        </div>
        <p className="text-[8px] tracking-[0.12em] text-[#a4959e] md:col-span-2 md:text-right md:text-[9px]">© TIXREPO</p>
      </div>
    </footer>
  );
}
