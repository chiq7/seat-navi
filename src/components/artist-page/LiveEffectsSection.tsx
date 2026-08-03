const EFFECT_DEFS: { key: string; label: string }[] = [
  { key: "center-stage", label: "センステ" },
  { key: "trolley",      label: "トロッコ" },
  { key: "aisle-walk",   label: "客降り" },
  { key: "silver-tape",  label: "銀テープ" },
  { key: "fanservice",   label: "ファンサ" },
];

type Props = {
  liveEffects: Record<string, boolean>;
};

export default function LiveEffectsSection({ liveEffects }: Props) {
  return (
    <section aria-labelledby="live-effects-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] text-[#f43679]">STAGE NOTES</p>
          <h3 id="live-effects-title" className="mt-1 text-[18px] font-black tracking-[-0.035em] text-[#1c171b]">この公演で見られた演出</h3>
        </div>
        <p className="mb-1 text-right text-[9px] font-black tracking-[0.12em] text-[#817981]">FAN REPORTS</p>
      </div>
      <div className="mt-5 grid grid-cols-2 border-l border-t border-[#ded8dc] sm:grid-cols-5">
        {EFFECT_DEFS.map((effect) => {
          const active = liveEffects[effect.key] ?? false;
          return (
            <div
              key={effect.key}
              className={`flex min-h-[86px] flex-col justify-between border-b border-r border-[#ded8dc] px-3 py-3 ${active ? "bg-[#fff0f5]" : "bg-white"}`}
            >
              <span className="text-[9px] font-black tracking-[0.16em] text-[#958d93]">{String(EFFECT_DEFS.indexOf(effect) + 1).padStart(2, "0")}</span>
              <div className="mt-3 flex items-end justify-between gap-2">
                <span className="text-[13px] font-black text-[#1c171b]">{effect.label}</span>
                <span className={`text-[8px] font-black tracking-[0.08em] ${active ? "text-[#f43679]" : "text-[#aaa2a8]"}`}>{active ? "SEEN" : "—"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
