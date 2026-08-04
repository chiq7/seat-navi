type Props = {
  aisleWalkStatus: "yes" | "no" | "unknown";
};

const STATUS_COPY = {
  yes: { label: "客降りあり", detail: "ファンの現地レポで確認", tone: "bg-[#fff0f5] text-[#f43679]" },
  no: { label: "客降りなし", detail: "現地レポでは確認されていません", tone: "bg-white text-[#1c171b]" },
  unknown: { label: "客降り情報なし", detail: "現地レポが集まると表示されます", tone: "bg-white text-[#817981]" },
} as const;

export default function LiveEffectsSection({ aisleWalkStatus }: Props) {
  const status = STATUS_COPY[aisleWalkStatus];

  return (
    <section aria-labelledby="live-effects-title">
      <p className="text-[10px] font-black tracking-[0.2em] text-[#f43679]">LOCAL NOTES</p>
      <div className={`mt-2 flex items-center justify-between gap-4 border border-[#ded8dc] px-4 py-3 ${status.tone}`}>
        <div>
          <h3 id="live-effects-title" className="text-[15px] font-black tracking-[-0.03em]">客降り</h3>
          <p className="mt-0.5 text-[10px] font-bold text-[#817981]">{status.detail}</p>
        </div>
        <span className="shrink-0 text-[14px] font-black tracking-[-0.03em]">{status.label}</span>
      </div>
    </section>
  );
}
