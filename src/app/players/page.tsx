import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SeasonTabs } from "@/components/season-tabs";
import { getSeasons, getSeasonStats } from "@/lib/data/stats";
import { formatRate, type PlayerSeasonStats } from "@/lib/stats";

export const metadata: Metadata = { title: "選手一覧" };

export default function PlayersPage({ searchParams }: PageProps<"/players">) {
  return (
    <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
      <PlayersView searchParams={searchParams} />
    </Suspense>
  );
}

async function PlayersView({ searchParams }: { searchParams: PageProps<"/players">["searchParams"] }) {
  const params = await searchParams;
  const seasons = await getSeasons();
  const n = Number(Array.isArray(params.season) ? params.season[0] : params.season);
  const season = seasons.includes(n) ? n : (seasons[0] ?? null);
  if (season === null) return <p className="text-slate-600">まだ選手の記録がありません。</p>;

  const stats = await getSeasonStats(season);
  // 正規メンバーは背番号順(番号なしは後ろ)、助っ人は名前順
  const byNumber = (a: PlayerSeasonStats, b: PlayerSeasonStats) => {
    const x = stats.numbers[a.playerId] ?? "";
    const y = stats.numbers[b.playerId] ?? "";
    if (x === "" || y === "") return (x === "" ? 1 : 0) - (y === "" ? 1 : 0) || a.fullName.localeCompare(b.fullName, "ja");
    return Number(x) - Number(y) || x.length - y.length;
  };
  const regulars = [...stats.qualified, ...stats.unqualified].sort(byNumber);
  const guests = [...stats.guests].sort((a, b) => a.fullName.localeCompare(b.fullName, "ja"));

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">{season}年 選手一覧</h1>
      <SeasonTabs seasons={seasons} current={season} href={(s) => `/players?season=${s}`} />
      <PlayerGroup title={`正規メンバー(${regulars.length}人)`} players={regulars} numbers={stats.numbers} season={season} />
      {stats.managers.length > 0 && (
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-600">マネージャー({stats.managers.length}人)</h2>
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
            {stats.managers.map((m) => (
              <li key={m.playerId} className="flex min-h-14 items-center gap-3 px-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-500/10 font-bold tabular-nums text-accent-600">
                  {m.number || "M"}
                </span>
                <span className="flex-1 font-medium">{m.fullName}</span>
                <span className="text-xs text-slate-500">マネージャー</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {guests.length > 0 && (
        <PlayerGroup title={`助っ人(${guests.length}人)`} players={guests} numbers={stats.numbers} season={season} />
      )}
    </section>
  );
}

function PlayerGroup({
  title,
  players,
  numbers,
  season,
}: {
  title: string;
  players: PlayerSeasonStats[];
  numbers: Record<string, string>;
  season: number;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-bold text-slate-600">{title}</h2>
      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
        {players.map((p) => (
          <li key={p.playerId}>
            <Link href={`/players/${p.playerId}?season=${season}`} className="flex min-h-14 items-center gap-3 px-3 hover:bg-slate-50">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold tabular-nums text-brand-700">
                {numbers[p.playerId] || "−"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.fullName}</span>
                <span className="text-xs text-slate-500">
                  {p.kind === "regular" && (p.qualified ? "規定到達" : "規定未達")}
                  {p.kind === "regular" && " ・ "}
                  出席 {p.attendance}
                </span>
              </span>
              <span className="grid shrink-0 grid-cols-2 gap-x-3 text-right text-sm tabular-nums">
                <span className="text-[10px] text-slate-500">打率</span>
                <span className="text-[10px] text-slate-500">OPS</span>
                <span className="font-bold">{formatRate(p.avg)}</span>
                <span className="font-bold">{formatRate(p.ops)}</span>
              </span>
              <span aria-hidden className="text-slate-400">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
