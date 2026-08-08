import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-[#eadfe4] bg-[#f8f1f5] text-[#51454c]">
      <div className="zr-container grid gap-7 pb-[calc(96px+env(safe-area-inset-bottom))] pt-10 md:grid-cols-[1fr_auto] md:items-end md:pb-14 md:pt-14">
        <div>
          <Link href="/" className="zr-focus inline-block rounded-md bg-white px-4 py-3">
            <Image src="/images/logo.png" alt="ちけレポ トップへ" width={132} height={34} className="h-7 w-auto" />
          </Link>
          <p className="mt-4 max-w-[520px] text-[12px] leading-6 text-[#81747c]">ライブの当落、座席表、会場の見え方、現地の熱をファン同士で共有するライブ情報コミュニティ。</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-[11px] font-bold text-[#6f626a] md:justify-end">
        <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-[#e94a7d]">
          利用規約
        </Link>
        <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-[#e94a7d]">
          プライバシーポリシー
        </Link>
        <Link href="/contact" className="inline-flex min-h-11 items-center hover:text-[#e94a7d]">
          お問い合わせ
        </Link>
        <Link href="/venues" className="inline-flex min-h-11 items-center hover:text-[#e94a7d]">
          ライブ会場一覧
        </Link>
        </div>
        <p className="text-[9px] tracking-[0.12em] text-[#a4959e] md:col-span-2 md:text-right">© TIXREPO</p>
      </div>
    </footer>
  );
}
