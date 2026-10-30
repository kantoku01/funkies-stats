"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ANSWER_MARK, type Answer } from "@/lib/schedule/month";
import { saveParticipants, type ParticipantsState } from "../../actions";

export type Candidate = {
  playerId: string;
  name: string;
  number: string; // 助っ人は「助」
  note: string | null; // 「在籍期間外」など
  registered: boolean; // すでに参加者として保存されている
  initiallyChecked: boolean; // 画面を開いたときにチェックを入れておくか(出欠の ○△ を含む)
  answer: Answer | null; // 出欠の回答
  battingOrder: string;
  paCount: number;
};

export function ParticipantsForm({ gameId, candidates }: { gameId: string; candidates: Candidate[] }) {
  const [state, formAction, pending] = useActionState<ParticipantsState, FormData>(saveParticipants, {
    errors: {},
    message: null,
  });
  const [checked, setChecked] = useState(() => new Set(candidates.filter((c) => c.initiallyChecked).map((c) => c.playerId)));
  // 入力エラーで戻ったときに打順が消えないよう、画面側で持つ
  const [orders, setOrders] = useState<Record<string, string>>(() =>
    Object.fromEntries(candidates.map((c) => [c.playerId, c.battingOrder])),
  );

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // 打席結果がある選手を外すときは、打席結果も消えることを確認する
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const losing = candidates.filter((c) => c.registered && c.paCount > 0 && !checked.has(c.playerId));
    if (losing.length === 0) return;
    const list = losing.map((c) => `・${c.name}(${c.paCount}打席)`).join("\n");
    if (!window.confirm(`次の選手を参加者から外すと、打席結果も一緒に消えます。\n${list}\nよろしいですか?`)) {
      e.preventDefault();
    }
  };

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4 pb-20">
      <input type="hidden" name="gameId" value={gameId} />
      {state.message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </p>
      )}

      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
        {candidates.map((c) => {
          const on = checked.has(c.playerId);
          const error = state.errors[c.playerId];
          return (
            <li key={c.playerId} className={on ? "bg-brand-50" : undefined}>
              <div className="flex min-h-14 items-center gap-3 px-3">
                <label className="flex flex-1 items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    name="player"
                    value={c.playerId}
                    checked={on}
                    onChange={() => toggle(c.playerId)}
                    className="size-6 shrink-0 accent-brand-600"
                  />
                  <span className="w-7 shrink-0 text-center tabular-nums text-slate-500">{c.number}</span>
                  <span className="flex-1">
                    <span className="font-medium">{c.name}</span>
                    {c.answer && (
                      <span
                        className={`ml-2 font-bold ${c.answer === "yes" ? "text-red-600" : c.answer === "maybe" ? "text-amber-600" : "text-slate-400"}`}
                        title="出欠の回答"
                      >
                        {ANSWER_MARK[c.answer]}
                      </span>
                    )}
                    {c.note && <span className="ml-2 text-xs text-amber-700">{c.note}</span>}
                    {c.paCount > 0 && <span className="ml-2 text-xs text-slate-500">{c.paCount}打席入力済み</span>}
                  </span>
                </label>
                {on && (
                  <label className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                    打順
                    <input
                      name={`order_${c.playerId}`}
                      value={orders[c.playerId] ?? ""}
                      onChange={(e) => setOrders((prev) => ({ ...prev, [c.playerId]: e.target.value }))}
                      inputMode="numeric"
                      maxLength={2}
                      aria-label={`${c.name}の打順`}
                      className="min-h-11 w-12 rounded-md border border-slate-300 bg-white text-center text-base"
                    />
                  </label>
                )}
              </div>
              {error && <p className="px-3 pb-2 text-sm text-red-700">{error}</p>}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-slate-500">
        助っ人もこの一覧から選びます。一覧にいない選手は
        <Link href="/admin/players/new" className="text-brand-700 underline">
          選手管理
        </Link>
        で追加してください。
      </p>

      {/* 主要操作は片手で届く画面下部に固定する */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="text-sm text-slate-600">{checked.size}人を選択中</span>
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 flex-1 rounded-md bg-brand-600 font-bold text-white disabled:opacity-60"
          >
            {pending ? "保存中…" : "参加者を保存"}
          </button>
        </div>
      </div>
    </form>
  );
}
