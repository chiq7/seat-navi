import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#100b10] text-white">
      <div className="zr-container grid gap-10 pb-[110px] pt-14 md:grid-cols-[1fr_auto] md:items-end md:pb-16 md:pt-20">
        <div>
          <Link href="/" className="zr-focus inline-block rounded-md bg-white px-4 py-3">
            <Image src="/images/logo.png" alt="ちけレポ トップへ" width={132} height={34} className="h-7 w-auto" />
          </Link>
          <p className="mt-6 max-w-[520px] text-[12px] leading-6 text-white/48">ライブの当落、座席表、会場の見え方、現地の熱をファン同士で共有するライブ情報コミュニティ。</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-[11px] font-bold text-white/65 md:justify-end">
        <Link href="/terms" className="hover:text-gray-700">
          利用規約
        </Link>
        <Link href="/privacy" className="hover:text-gray-700">
          プライバシーポリシー
        </Link>
        <Link href="/contact" className="hover:text-gray-700">
          お問い合わせ
        </Link>
        <Link href="/venues" className="hover:text-gray-700">
          ライブ会場一覧
        </Link>
        </div>
        <p className="text-[9px] tracking-[0.12em] text-white/28 md:col-span-2 md:text-right">© TIXREPO</p>
      </div>
    </footer>
  );
}
