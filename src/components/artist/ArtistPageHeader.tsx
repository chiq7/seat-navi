import Link from "next/link";

type Props = { artistName: string };

export function ArtistPageHeader({ artistName }: Props) {
  return (
    <header
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex justify-between items-center px-4 h-14"
      style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <Link
        href="/"
        className="w-9 h-9 flex items-center justify-center rounded-full active:scale-95 transition-transform"
        style={{ background: "rgba(0,104,118,0.06)" }}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Link>
      <h1 className="text-base font-bold tracking-tight" style={{ color: "#006876" }}>
        {artistName}
      </h1>
      <div className="w-9" />
    </header>
  );
}
