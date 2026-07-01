import Image from "next/image";

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
    <section className="mt-5 px-4">
      <h2 className="mb-2.5 text-[13px] font-bold text-gray-900">この公演で見られた演出</h2>
      <div className="flex gap-2">
        {EFFECT_DEFS.map((effect) => {
          const active = liveEffects[effect.key] ?? false;
          const src = `/images/reports/ive-effects/${effect.key}-${active ? "active" : "inactive"}.png`;
          return (
            <div
              key={effect.key}
              className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-[#FF6B9D]/20 bg-white px-1 py-2.5"
            >
              <Image
                src={src}
                alt={effect.label}
                width={36}
                height={36}
                className="object-contain"
              />
              <span className="whitespace-nowrap text-[9px] font-semibold text-gray-600">
                {effect.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
