export default function PublicAlternateNames({ names }: { names: readonly string[] }) {
  if (!names.length) return null;
  return (
    <p data-public-alternate-names className="my-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px] leading-5 text-[#68525e]">
      <span className="shrink-0 font-bold">別名・通称</span>
      {names.map(name => <span key={name} data-public-alternate-name>{name}</span>)}
    </p>
  );
}
