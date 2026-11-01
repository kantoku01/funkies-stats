"use client";

import { useState } from "react";
import { COST_ITEM_CHOICES, COST_ITEM_LABEL, type CostItem } from "@/lib/games/costs";

type Row = { item: CostItem; amount: string; opponentShare: string; payer: string; memo: string };
const blank = (): Row => ({ item: "ground_umpire", amount: "", opponentShare: "", payer: "", memo: "" });
const input = "block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base";

function initialRows(json: string | undefined): Row[] {
  try {
    const rows = JSON.parse(json || "[]") as Row[];
    return Array.isArray(rows) && rows.length > 0 ? rows : [];
  } catch {
    return [];
  }
}

// 試合予定の追加で、当日のお金もまとめて入れる(任意)。送るときは JSON にして costs に入れる
export function CostRows({ members, initial }: { members: { id: string; name: string }[]; initial?: string }) {
  const [rows, setRows] = useState<Row[]>(() => initialRows(initial));
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">当日のお金(任意)</legend>
      <input type="hidden" name="costs" value={JSON.stringify(rows)} />
      {rows.map((r, i) => (
        <div key={i} className="space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-slate-600">項目</span>
              <select aria-label="項目" value={r.item} onChange={(e) => set(i, { item: e.target.value as CostItem })} className={input}>
                {COST_ITEM_CHOICES.map((k) => (
                  <option key={k} value={k}>
                    {COST_ITEM_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-slate-600">支払う総額(円)</span>
              <input aria-label="支払う総額" inputMode="numeric" value={r.amount} onChange={(e) => set(i, { amount: e.target.value })} placeholder="11000" className={input} />
            </label>
          </div>
          {r.item !== "opponent" && (
            <label className="block space-y-1">
              <span className="text-slate-600">うち相手チームから受け取る額(円・なければ空欄)</span>
              <input
                aria-label="うち相手チームから受け取る額"
                inputMode="numeric"
                value={r.opponentShare}
                onChange={(e) => set(i, { opponentShare: e.target.value })}
                placeholder="5500"
                className={input}
              />
            </label>
          )}
          <select aria-label="払う人" value={r.payer} onChange={(e) => set(i, { payer: e.target.value })} className={input}>
            <option value="">払う人: 未定(試合後に決める)</option>
            <option value="club">部費から</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}さんが立て替え
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input aria-label="メモ" value={r.memo} onChange={(e) => set(i, { memo: e.target.value })} maxLength={100} placeholder="メモ(任意)" className={input} />
            <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="shrink-0 rounded-md border border-red-300 px-3 text-red-700">
              消す
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, blank()])}
        className="min-h-10 w-full rounded-md border border-brand-600 text-sm font-bold text-brand-700"
      >
        ＋ 当日のお金を追加
      </button>
      <p className="text-xs text-slate-500">あとから試合の画面でも足したり直したりできます。</p>
    </fieldset>
  );
}
