export default function LoginCta() {
  return (
    <div
      className="mx-4 mt-5 rounded-2xl border p-4 flex items-center gap-3"
      style={{ backgroundColor: "#FDF0F4", borderColor: "#F4D6DE" }}
    >
      {/* Ticket icon */}
      <div
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: "#FADDE6" }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FF6B9D">
          <path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-1.99.9-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2zm-2-1.46V15H6V10.55c1.17-.69 2-1.96 2-3.55h8c0 1.59.83 2.86 2 3.55z" />
        </svg>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-gray-800 leading-snug">
          推し優先表示にするにはログイン
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
          お気に入り登録や推しの公演を優先表示できます
        </p>
      </div>

      {/* ログイン機能は準備中 */}
      <span
        className="shrink-0 rounded-full px-3.5 py-2 text-[11px] font-bold text-gray-400"
        style={{ backgroundColor: "#F3F4F6" }}
      >
        準備中
      </span>
    </div>
  );
}
