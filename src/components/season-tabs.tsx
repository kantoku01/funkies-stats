import Link from "next/link";

// シーズン切替のボタン列
export function SeasonTabs({ seasons, current, href }: { seasons: number[]; current: number; href: (s: number) => string }) {
  if (seasons.length <= 1) return null;
  return (
    <nav aria-label="シーズン切替" className="flex flex-wrap gap-1">
      {seasons.map((s) => (
        <Link
          key={s}
          href={href(s)}
          aria-current={s === current ? "page" : undefined}
          className={`flex min-h-11 items-center rounded-md px-3 text-sm ${
            s === current ? "bg-brand-600 font-bold text-white" : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          {s}
        </Link>
      ))}
    </nav>
  );
}
