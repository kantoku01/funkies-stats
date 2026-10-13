"use client";

import Link from "next/link";
import { useState } from "react";
import {
  STAT_COLUMNS,
  type LeaderboardGroup,
  type LeaderboardRow,
  type SortKey,
  type TeamTotalsRow,
} from "./columns";

type Sort = { key: SortKey; dir: "asc" | "desc" };
const DEFAULT_SORT: Sort = { key: "ops", dir: "desc" };

// 背番号は "0" < "00" < "1" … の順(数値 → 桁数)
function compareNumber(a: string, b: string): number {
  if (a === b) return 0;
  if (a === "") return 1;
  if (b === "") return -1;
  return Number(a) - Number(b) || a.length - b.length;
}

function sortRows(rows: LeaderboardRow[], sort: Sort): LeaderboardRow[] {
  // 既定の並び(サーバー側で OPS 降順に並べ済み)はそのまま使う
  if (sort.key === DEFAULT_SORT.key && sort.dir === DEFAULT_SORT.dir) return rows;
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort.key === "number") return sign * compareNumber(a.number, b.number);
    if (sort.key === "name") return sign * a.name.localeCompare(b.name, "ja");
    return sign * (a.values[sort.key] - b.values[sort.key]);
  });
}

// 背番号・氏名の列は横スクロールしても固定する
const STICKY_NUMBER = "sticky left-0 z-10 w-10 min-w-10";
const STICKY_NAME = "sticky left-10 z-10 min-w-24 max-w-32 truncate border-r border-slate-200";

export function LeaderboardTable({
  groups,
  team,
  season,
}: {
  groups: LeaderboardGroup[];
  team: TeamTotalsRow;
  season: number;
}) {
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);

  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "desc" ? "asc" : "desc" }
        : // 数字の列は大きい順から、背番号・氏名は小さい順から
          { key, dir: key === "number" || key === "name" ? "asc" : "desc" },
    );

  const header = (key: SortKey, label: string, className = "") => {
    const active = sort.key === key;
    return (
      <th
        key={key}
        scope="col"
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
        className={`bg-slate-100 p-0 font-medium ${className}`}
      >
        <button
          type="button"
          onClick={() => onSort(key)}
          className={`flex min-h-11 w-full items-center justify-center gap-0.5 whitespace-nowrap px-2 ${active ? "text-blue-900" : "text-slate-600"}`}
        >
          {label}
          <span aria-hidden className="w-2 text-[10px]">
            {active ? (sort.dir === "desc" ? "▼" : "▲") : ""}
          </span>
        </button>
      </th>
    );
  };

  const colCount = STAT_COLUMNS.length + 2;

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full border-collapse text-sm tabular-nums">
        <thead>
          <tr className="border-b border-slate-200">
            {header("number", "背番", `${STICKY_NUMBER} z-20`)}
            {header("name", "氏名", `${STICKY_NAME} z-20`)}
            {STAT_COLUMNS.map((c) => header(c.key, c.label))}
          </tr>
        </thead>
        {groups.map((group) =>
          group.rows.length === 0 ? null : (
            <tbody key={group.key}>
              {group.label && (
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th colSpan={colCount} scope="rowgroup" className="p-0 text-left">
                    <span className="sticky left-0 inline-block px-3 py-1.5 text-xs font-bold text-slate-600">
                      {group.label}
                    </span>
                  </th>
                </tr>
              )}
              {sortRows(group.rows, sort).map((row) => (
                <tr key={row.playerId} className="group border-b border-slate-100 last:border-slate-200">
                  <td className={`${STICKY_NUMBER} bg-white px-2 py-2 text-center text-slate-500 group-hover:bg-slate-50`}>
                    {row.number}
                  </td>
                  <th scope="row" className={`${STICKY_NAME} bg-white px-2 py-2 text-left font-medium group-hover:bg-slate-50`}>
                    <Link href={`/players/${row.playerId}?season=${season}`} className="block truncate text-blue-900">
                      {row.name}
                    </Link>
                  </th>
                  {STAT_COLUMNS.map((c) => (
                    <td
                      key={c.key}
                      className={`whitespace-nowrap px-2 py-2 text-right ${sort.key === c.key ? "bg-blue-50 font-semibold" : ""}`}
                    >
                      {row.display[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ),
        )}
        <tfoot>
          <tr className="bg-slate-100 font-semibold">
            <td className={`${STICKY_NUMBER} bg-slate-100`} />
            <th scope="row" className={`${STICKY_NAME} bg-slate-100 px-2 py-2 text-left`}>
              チーム計
            </th>
            {STAT_COLUMNS.map((c) => (
              <td key={c.key} className="whitespace-nowrap px-2 py-2 text-right">
                {team.display[c.key] ?? ""}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
