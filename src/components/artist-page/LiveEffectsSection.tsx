import Image from "next/image";

type Props = {
  liveEffects: Record<string, boolean>;
};

const EFFECT_DEFS: { key: string; label: string; activeIcon: string; inactiveIcon: string }[] = [
  { key: "center-stage", label: "センターステージ", activeIcon: "/images/reports/ive-effects/center-stage-active.png", inactiveIcon: "/images/reports/ive-effects/center-stage-inactive.png" },
  { key: "trolley", label: "トロッコ", activeIcon: "/images/reports/ive-effects/trolley-active.png", inactiveIcon: "/images/reports/ive-effects/trolley-inactive.png" },
  { key: "aisle-walk", label: "客席への登場", activeIcon: "/images/reports/ive-effects/aisle-walk-active.png", inactiveIcon: "/images/reports/ive-effects/aisle-walk-inactive.png" },
  { key: "silver-tape", label: "銀テープ", activeIcon: "/images/reports/ive-effects/silver-tape-active.png", inactiveIcon: "/images/reports/ive-effects/silver-tape-inactive.png" },
  { key: "fanservice", label: "ファンサービス", activeIcon: "/images/reports/ive-effects/fanservice-active.png", inactiveIcon: "/images/reports/ive-effects/fanservice-inactive.png" },
];

export default function LiveEffectsSection({ liveEffects }: Props) {
  const confirmed = EFFECT_DEFS.filter(effect => liveEffects[effect.key]);
  if (!confirmed.length) return <p className="text-[13px] text-[#625a61]">演出の報告はまだありません。</p>;
  return (
    <section aria-labelledby="live-effects-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 id="live-effects-title" className="text-[18px] font-black tracking-[-0.035em] text-[#1c171b]">報告された演出</h3>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 border-y border-l border-[#ded8dc] sm:grid-cols-3">
        {confirmed.map((effect) => {
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
