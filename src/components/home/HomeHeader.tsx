import Link from "next/link";

export default function HomeHeader() {
  return (
    <header className="bg-white px-4 py-2.5 flex items-center gap-3">
      <Link href="/" className="shrink-0">
        <span
          style={{
            color: "#FF6B9D",
            fontSize: "18px",
            fontWeight: 700,
            fontFamily: "'Noto Sans JP', sans-serif",
          }}
        >
          ちけレポ
        </span>
      </Link>
    </header>
  );
}
