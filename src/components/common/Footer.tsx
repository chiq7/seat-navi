import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-pink-100 bg-white">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-3 pb-[96px] pt-5 text-[11px] text-gray-500">
        <Link href="/terms" className="hover:text-gray-700">
          利用規約
        </Link>
        <Link href="/privacy" className="hover:text-gray-700">
          プライバシーポリシー
        </Link>
        <Link href="/contact" className="hover:text-gray-700">
          お問い合わせ
        </Link>
        <p className="basis-full text-center text-[10px] text-gray-400">© ちけレポ</p>
      </div>
    </footer>
  );
}
