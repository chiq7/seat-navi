import Link from "next/link";

export type BreadcrumbParent = { href: string; label: string };

type Props = {
  current: string;
  parents?: readonly BreadcrumbParent[];
  existingSchema?: boolean;
};

export function Breadcrumbs({ current, parents = [], existingSchema = false }: Props) {
  const links = [{ href: "/", label: "ちけレポ" }, ...parents];
  return <nav aria-label="パンくずリスト" className="relative z-10 border-b border-[#f1e4ea] bg-white">
    <ol className="zr-container flex flex-wrap items-center gap-x-1 py-1 text-xs leading-5 text-[#65525c]"
      itemScope={!existingSchema || undefined} itemType={existingSchema ? undefined : "https://schema.org/BreadcrumbList"}>
      {links.map(({ href, label }, index) => <li key={href} className="flex max-w-full items-center gap-1"
        itemProp={existingSchema ? undefined : "itemListElement"} itemScope={!existingSchema || undefined}
        itemType={existingSchema ? undefined : "https://schema.org/ListItem"}>
        <Link href={href} className="zr-focus inline-flex min-h-8 items-center break-words px-1 text-[#8d335e] underline underline-offset-2"
          itemProp={existingSchema ? undefined : "item"}><span itemProp={existingSchema ? undefined : "name"}>{label}</span></Link>
        {!existingSchema && <meta itemProp="position" content={String(index + 1)} />}
        <span aria-hidden="true" className="text-[#927f89]">›</span>
      </li>)}
      <li aria-current="page" className="min-w-0 break-words px-1 py-1 font-semibold [overflow-wrap:anywhere]"
        itemProp={existingSchema ? undefined : "itemListElement"} itemScope={!existingSchema || undefined}
        itemType={existingSchema ? undefined : "https://schema.org/ListItem"}>
        <span itemProp={existingSchema ? undefined : "name"}>{current}</span>
        {!existingSchema && <meta itemProp="position" content={String(links.length + 1)} />}
      </li>
    </ol>
  </nav>;
}
