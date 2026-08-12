import Image from "next/image";

type Props = {
  liveEffects: Record<string, boolean>;
};

const EFFECT_DEFS: { key: string; label: string; activeIcon: string; inactiveIcon: string }[] = [
  { key: "center-stage", label: "センステ", activeIcon: "/images/reports/ive-effects/center-stage-active.png", inactiveIcon: "/images/reports/ive-effects/center-stage-inactive.png" },
  { key: "trolley", label: "トロッコ", activeIcon: "/images/reports/ive-effects/trolley-active.png", inactiveIcon: "/images/reports/ive-effects/trolley-inactive.png" },
  { key: "aisle-walk", label: "客降り", activeIcon: "/images/reports/ive-effects/aisle-walk-active.png", inactiveIcon: "/images/reports/ive-effects/aisle-walk-inactive.png" },
  { key: "silver-tape", label: "銀テープ", activeIcon: "/images/reports/ive-effects/silver-tape-active.png", inactiveIcon: "/images/reports/ive-effects/silver-tape-inactive.png" },
  { key: "fanservice", label: "ファンサ", activeIcon: "/images/reports/ive-effects/fanservice-active.png", inactiveIcon: "/images/reports/ive-effects/fanservice-inactive.png" },
];

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
      <div className="mt-3 grid grid-cols-5 border-y border-l border-[#ded8dc]">
        {EFFECT_DEFS.map((effect) => {
          const active = liveEffects[effect.key] ?? false;
          return (
            <div key={effect.key} className={`flex min-h-[62px] min-w-0 flex-col items-center justify-center gap-1.5 border-r border-[#ded8dc] px-1 py-2 ${active ? "bg-[#fff0f5]" : "bg-white"}`}>
              <Image src={active ? effect.activeIcon : effect.inactiveIcon} alt="" width={26} height={26} unoptimized className="h-[26px] w-[26px] object-contain" />
              <span className={`min-w-0 truncate whitespace-nowrap text-[10px] font-black tracking-[-0.03em] sm:text-[12px] ${active ? "text-[#f43679]" : "text-[#958d93]"}`}>{effect.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
