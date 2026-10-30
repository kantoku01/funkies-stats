import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { getPlayersForAdmin } from "@/lib/data/players";
import { currentYearInJapan } from "@/lib/season";
import { resolveNumber } from "@/lib/stats";
import { getEditableSeasons, pickSeason } from "./season";

export const metadata: Metadata = { title: "選手管理" };

type Player = Awaited<ReturnType<typeof getPlayersForAdmin>>["players"][number];

export default async function PlayersPage({ searchParams }: PageProps<"/admin/players">) {
  const params = await searchParams;
  await connection(); // 今日の日付を使うので、リクエストごとに描画する
  const now = new Date();
  const seasons = await getEditableSeasons(now);
  const season = pickSeason(params.season, seasons, currentYearInJapan(now));
  const { players, numbers } = await getPlayersForAdmin();

  const start = `${season}-01-01`;
  const end = `${season}-12-31`;
  const inTerm = (p: Player) => (p.joined_on ?? "") <= end && (p.left_on === null || p.left_on >= start);
  const enrolled = (p: Player) => p.kind === "regular" && inTerm(p);
  const managers = players.filter((p) => p.kind === "manager" && inTerm(p));

  const numberOf = (p: Player) => resolveNumber(numbers, p.id, season);
  const byNumber = (a: Player, b: Player) => {
    const x = numberOf(a);
    const y = numberOf(b);
    if (x === null || y === null) return x === null ? (y === null ? 0 : 1) : -1;
    return Number(x) - Number(y) || x.length - y.length;
  };

  const sections = [
    { title: `${season}年の正規メンバー`, rows: players.filter(enrolled).sort(byNumber) },
    { title: "マネージャー", rows: managers.sort(byNumber) },
    { title: "助っ人", rows: players.filter((p) => p.kind === "guest") },
    { title: `${season}年は在籍していない人`, rows: players.filter((p) => p.kind !== "guest" && !inTerm(p)) },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">選手管理</h1>
        <Link
          href={`/admin/players/new?season=${season}`}
          className="flex min-h-11 items-center rounded-md bg-brand-600 px-4 font-bold text-white"
        >
          選手を追加
        </Link>
      </div>

      <nav aria-label="シーズン" className="flex flex-wrap gap-1">
        {seasons.map((s) => (
          <Link
            key={s}
            href={`/admin/players?season=${s}`}
            aria-current={s === season ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-md px-3 text-sm ${
              s === season ? "bg-brand-600 font-bold text-white" : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            {s}年
          </Link>
        ))}
      </nav>
      <p className="text-xs text-slate-500">背番号は選んだシーズンのものです。番号がないシーズンは前のシーズンの番号を引き継ぎます。</p>

      {sections.map(
        (section) =>
          section.rows.length > 0 && (
            <div key={section.title} className="space-y-1">
              <h2 className="text-sm font-bold text-slate-600">
                {section.title}({section.rows.length}人)
              </h2>
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
                {section.rows.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/players/${p.id}?season=${season}`}
                      className="flex min-h-12 items-center gap-3 px-3 hover:bg-slate-50"
                    >
                      <span className="w-8 text-center tabular-nums text-slate-500">
                        {p.kind === "guest" ? "助" : (numberOf(p) ?? "−")}
                      </span>
                      <span className="flex-1 font-medium">{p.full_name}</span>
                      <span className="text-xs text-slate-500">
                        {p.left_on ? `${p.left_on.replaceAll("-", "/")} 退団` : p.joined_on ? `${p.joined_on.replaceAll("-", "/")} 加入` : ""}
                      </span>
                      <span aria-hidden className="text-slate-400">
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ),
      )}
    </section>
  );
}
