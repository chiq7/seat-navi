import Link from "next/link";

type Props = {
  title: string | null;
};

export function EventPageHeader({ title }: Props) {
  return (
    <header
      className="fixed left-1/2 top-0 z-50 flex h-14 w-full max-w-[430px] -translate-x-1/2 items-center justify-between px-4"
      style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <Link
        href="/"
        className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-95"
        style={{ background: "rgba(0,104,118,0.06)" }}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Link>
      <div className="text-center">
        <p className="text-sm font-bold tracking-tight" style={{ color: "#006876" }}>
          {title ?? "読み込み中..."}
        </p>
        <p className="text-[10px] text-gray-400">座席予想</p>
      </div>
      <div className="w-9" />
    </header>
  );
}
