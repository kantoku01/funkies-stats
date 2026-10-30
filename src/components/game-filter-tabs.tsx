import Link from "next/link";
import type { TournamentSummary } from "@/lib/data/stats";

// 成績の絞り込み: 全試合 / 公式戦 / オープン戦 / 大会ごと
export function GameFilterTabs({
  current,
  tournaments,
  href,
}: {
  current: string;
  tournaments: TournamentSummary[];
  href: (key: string) => string;
}) {
  const options = [
    { key: "all", label: "全試合" },
    { key: "official", label: "公式戦" },
    { key: "open", label: "オープン戦" },
    ...tournaments.map((t) => ({ key: `t-${t.id}`, label: t.name })),
  ];
  return (
    <nav aria-label="試合の種類で絞り込み" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
      {options.map((o) => (
        <Link
          key={o.key}
          href={href(o.key)}
          aria-current={o.key === current ? "page" : undefined}
          className={`flex min-h-9 shrink-0 items-center rounded-full px-3 text-sm ${
            o.key === current ? "bg-accent-500 font-bold text-white" : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

// 絞り込み中の見出し(「公式戦 5試合 3勝2敗」)
export function filterSummary(
  key: string,
  record: { games: number; wins: number; losses: number; draws: number },
  tournaments: TournamentSummary[],
): string | null {
  if (key === "all") return null;
  const name =
    key === "official" ? "公式戦" : key === "open" ? "オープン戦" : (tournaments.find((t) => `t-${t.id}` === key)?.name ?? "大会");
  return `${name} ${record.games}試合 ${record.wins}勝${record.losses}敗${record.draws > 0 ? `${record.draws}分` : ""}`;
}
