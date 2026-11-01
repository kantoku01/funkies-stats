import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EditorOnly } from "@/components/editor-only";
import { SettleButton, UnsettleButton } from "@/components/ledger/settle-button";
import { SeasonTabs } from "@/components/season-tabs";
import { getCurrentEditor } from "@/lib/auth";
import { getLedger, type LedgerData } from "@/lib/data/ledger";
import { formatGameDate } from "@/lib/format";
import { CATEGORY_LABEL, formatYen } from "@/lib/ledger/categories";
import { summarizeLedger, type LedgerEntry } from "@/lib/ledger/summary";
import { currentYearInJapan } from "@/lib/season";

export const metadata: Metadata = { title: "チーム経費" };

export default function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  return (
    <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
      <ExpensesView searchParams={searchParams} />
    </Suspense>
  );
}

async function ExpensesView({ searchParams }: { searchParams: PageProps<"/expenses">["searchParams"] }) {
  const params = await searchParams;
  await connection(); // 今年(日本時間)を既定のシーズンにするので、リクエストごとに描画する
  const thisYear = currentYearInJapan(new Date());
  const data = await getLedger();

  const seasons = [...new Set([thisYear, ...data.entries.map((e) => e.season)])].sort((a, b) => b - a);
  const n = Number(Array.isArray(params.season) ? params.season[0] : params.season);
  const season = seasons.includes(n) ? n : thisYear;
  const summary = summarizeLedger(data.entries, season);
  const nameOf = new Map(data.players.map((p) => [p.id, p.full_name]));
  const gameOf = new Map(data.games.map((g) => [g.id, g]));

  // 年会費: そのシーズンに在籍していた正規メンバー + 納入記録のある人(マネージャーは年会費なし)
  const enrolled = data.players.filter(
    (p) =>
      p.kind === "regular" &&
      (p.joined_on ?? "") <= `${season}-12-31` &&
      (p.left_on === null || p.left_on >= `${season}-01-01`),
  );
  const duesRows = [
    ...enrolled.map((p) => ({ id: p.id, name: p.full_name })),
    ...[...summary.season.dues.keys()].filter((id) => !enrolled.some((p) => p.id === id)).map((id) => ({ id, name: nameOf.get(id) ?? "(不明)" })),
  ];
  const paidCount = duesRows.filter((r) => summary.season.dues.has(r.id)).length;
  const seasonEntries = data.entries.filter((e) => e.season === season);
  // 精算した日が新しい順に5件
  const recentlySettled = data.entries
    .filter((e) => e.kind === "expense" && e.player_id && e.settled_on)
    .sort((a, b) => b.settled_on!.localeCompare(a.settled_on!) || b.entry_date.localeCompare(a.entry_date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">チーム経費</h1>
        <EditorOnly>
          <Link href="/admin/ledger/new" className="flex min-h-11 items-center rounded-md bg-brand-600 px-4 font-bold text-white">
            入出金を追加
          </Link>
        </EditorOnly>
      </div>

      {/* 残高(全期間の通算) */}
      <section className="rounded-lg bg-brand-600 p-4 text-white">
        <p className="text-sm text-brand-100">部費の残高</p>
        <p className="text-3xl font-bold tabular-nums">{formatYen(summary.balance)}</p>
        {summary.pendingTotal > 0 && (
          <p className="mt-2 border-t border-white/20 pt-2 text-sm text-brand-100">
            未精算の立て替え {formatYen(summary.pendingTotal)} を返すと、残り{" "}
            <span className="whitespace-nowrap font-bold text-white">{formatYen(summary.balance - summary.pendingTotal)}</span>
          </p>
        )}
      </section>

      {/* 未精算の立て替え */}
      <section className="space-y-2">
        <h2 className="font-bold">未精算の立て替え</h2>
        {summary.pending.length === 0 ? (
          <p className="text-sm text-slate-500">ありません。</p>
        ) : (
          // 同じ人の立て替えもまとめずに、1件ずつ日付の早い順に並べる
          <ul className="divide-y divide-amber-100 rounded-md border border-amber-200 bg-white text-sm">
            {summary.pending
              .flatMap((p) => p.entries)
              .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
              .map((e) => (
                <li key={e.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="w-12 shrink-0 tabular-nums text-slate-500">{formatGameDate(e.entry_date, false)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{nameOf.get(e.player_id!) ?? "(不明)"} さん</span>
                    <span className="block truncate">
                      {CATEGORY_LABEL[e.category]}
                      {e.memo && <span className="text-slate-500"> {e.memo}</span>}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums">{formatYen(e.amount)}</span>
                  <EditorOnly>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SettleButton entryId={e.id} label={`${nameOf.get(e.player_id!)}さんの立て替え ${formatYen(e.amount)}`} />
                      <Link href={`/admin/ledger/${e.id}`} className="text-xs text-brand-700">
                        直す ›
                      </Link>
                    </div>
                  </EditorOnly>
                </li>
              ))}
          </ul>
        )}
      </section>

      {/* 最近精算した立て替え(間違えて精算済みにしたら、ここから戻す・直す) */}
      {recentlySettled.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold">最近精算した立て替え</h2>
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white text-sm">
            {recentlySettled.map((e) => (
              <li key={e.id} className="flex items-center gap-2 px-3 py-2">
                <span className="w-12 shrink-0 tabular-nums text-slate-500">{formatGameDate(e.entry_date, false)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{nameOf.get(e.player_id!) ?? "(不明)"} さん</span>
                  <span className="block truncate">
                    {CATEGORY_LABEL[e.category]}
                    {e.memo && <span className="text-slate-500"> {e.memo}</span>}
                  </span>
                  <span className="block text-xs text-slate-500">{formatGameDate(e.settled_on!, false)} 精算</span>
                </span>
                <span className="font-bold tabular-nums">{formatYen(e.amount)}</span>
                <EditorOnly>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <UnsettleButton entryId={e.id} label={`${nameOf.get(e.player_id!)}さんの立て替え ${formatYen(e.amount)}`} />
                    <Link href={`/admin/ledger/${e.id}`} className="text-xs text-brand-700">
                      直す ›
                    </Link>
                  </div>
                </EditorOnly>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SeasonTabs seasons={seasons} current={season} href={(s) => `/expenses?season=${s}`} />

      {/* その年の収支 */}
      <section className="space-y-2">
        <h2 className="font-bold">{season}年の収支</h2>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Total label="収入" value={summary.season.income} className="text-emerald-700" />
          <Total label="支出" value={summary.season.expense} className="text-red-700" />
          <Total label="差し引き" value={summary.season.income - summary.season.expense} />
        </dl>
        {summary.season.byCategory.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white text-sm">
            {summary.season.byCategory.map((c) => (
              <li key={`${c.kind}:${c.category}`} className="flex justify-between px-3 py-2">
                <span>
                  <span className={`mr-2 text-xs ${c.kind === "income" ? "text-emerald-700" : "text-red-700"}`}>
                    {c.kind === "income" ? "収入" : "支出"}
                  </span>
                  {CATEGORY_LABEL[c.category]}
                </span>
                <span className="tabular-nums">{formatYen(c.total)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">支出には、まだ精算していない立て替えも含みます。</p>
      </section>

      {/* 年会費 */}
      <section className="space-y-2">
        <h2 className="font-bold">
          {season}年の年会費 <span className="text-sm font-normal text-slate-500">(納入 {paidCount}/{duesRows.length}人)</span>
        </h2>
        <ul className="grid grid-cols-2 gap-1.5 text-sm">
          {duesRows.map((r) => {
            const paid = summary.season.dues.get(r.id);
            return (
              <li
                key={r.id}
                className={`flex items-center justify-between rounded-md border px-2 py-2 ${paid ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}
              >
                <span className="truncate">{r.name}</span>
                <span className={`shrink-0 tabular-nums ${paid ? "font-bold text-emerald-800" : "text-slate-400"}`}>
                  {paid ? formatYen(paid) : "未納"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 入出金の一覧 */}
      <section className="space-y-2">
        <h2 className="font-bold">{season}年の入出金</h2>
        <Suspense fallback={<EntryList entries={seasonEntries} data={data} nameOf={nameOf} gameOf={gameOf} editable={false} />}>
          <EditableEntryList entries={seasonEntries} data={data} nameOf={nameOf} gameOf={gameOf} />
        </Suspense>
      </section>
    </div>
  );
}


function Total({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-1 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`font-bold tabular-nums ${className}`}>{formatYen(value)}</dd>
    </div>
  );
}

type ListProps = {
  entries: LedgerEntry[];
  data: LedgerData;
  nameOf: Map<string, string>;
  gameOf: Map<string, LedgerData["games"][number]>;
};

async function EditableEntryList(props: ListProps) {
  return <EntryList {...props} editable={Boolean(await getCurrentEditor())} />;
}

function EntryList({ entries, nameOf, gameOf, editable }: ListProps & { editable: boolean }) {
  if (entries.length === 0) return <p className="text-sm text-slate-500">記録はまだありません。</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
      {entries.map((e) => {
        const who = e.player_id ? nameOf.get(e.player_id) ?? "(不明)" : null;
        const note =
          e.kind === "income"
            ? who && `${who}さん`
            : who
              ? `${who}さん立替・${e.settled_on ? `${formatGameDate(e.settled_on, false)}精算` : "未精算"}`
              : "部費から";
        const game = e.game_id ? gameOf.get(e.game_id) : undefined;
        const body = (
          <>
            <span className="w-12 shrink-0 text-sm tabular-nums text-slate-500">{formatGameDate(e.entry_date, false)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {CATEGORY_LABEL[e.category]}
                {e.memo && <span className="font-normal text-slate-600"> {e.memo}</span>}
              </span>
              <span className={`block truncate text-xs ${e.kind === "expense" && who && !e.settled_on ? "text-amber-700" : "text-slate-500"}`}>
                {[note, game && `${formatGameDate(game.game_date, false)} ${game.opponent ?? ""}の試合`].filter(Boolean).join(" ・ ")}
              </span>
            </span>
            <span className={`shrink-0 font-bold tabular-nums ${e.kind === "income" ? "text-emerald-700" : "text-red-700"}`}>
              {e.kind === "income" ? "+" : "−"}
              {formatYen(e.amount)}
            </span>
          </>
        );
        return (
          <li key={e.id}>
            {editable ? (
              <Link href={`/admin/ledger/${e.id}`} className="flex min-h-12 items-center gap-2 px-3 py-1.5 hover:bg-slate-50">
                {body}
                <span aria-hidden className="text-slate-400">
                  ›
                </span>
              </Link>
            ) : (
              <div className="flex min-h-12 items-center gap-2 px-3 py-1.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
