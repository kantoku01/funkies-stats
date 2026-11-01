"use client";

import { useActionState, useState } from "react";
import { COST_ITEM_CHOICES, COST_ITEM_LABEL, type CostItem, type GameCost } from "@/lib/games/costs";
import { deleteGameCost, saveGameCost, type CostState } from "./cost-actions";

type Member = { id: string; name: string };
const input = "block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base";
const initial: CostState = { message: null };

// 編集者向け: 当日のお金を足す・直す
function CostForm({ gameId, members, cost, onDone }: { gameId: string; members: Member[]; cost?: GameCost; onDone?: () => void }) {
  const [state, action, pending] = useActionState(async (prev: CostState, fd: FormData) => {
    const r = await saveGameCost(prev, fd);
    if (r.ok) onDone?.();
    return r;
  }, initial);
  const [item, setItem] = useState<CostItem>(cost?.item ?? "umpire");
  return (
    <form action={action} className="space-y-2 text-sm">
      <input type="hidden" name="gameId" value={gameId} />
      {cost && <input type="hidden" name="id" value={cost.id} />}
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-slate-600">項目</span>
          <select name="item" value={item} onChange={(e) => setItem(e.target.value as CostItem)} className={input}>
            {(cost?.item === "other" ? [...COST_ITEM_CHOICES, "other" as const] : COST_ITEM_CHOICES).map((k) => (
              <option key={k} value={k}>
                {COST_ITEM_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-slate-600">支払う総額(円)</span>
          <input name="amount" inputMode="numeric" required defaultValue={cost?.amount ?? ""} placeholder="7000" className={input} />
        </label>
      </div>
      {item !== "opponent" && (
        <label className="block space-y-1">
          <span className="text-slate-600">うち相手チームから受け取る額(円・なければ空欄)</span>
          <input name="opponentShare" inputMode="numeric" defaultValue={cost?.opponent_share || ""} placeholder="5000" className={input} />
        </label>
      )}
      <label className="block space-y-1">
        <span className="text-slate-600">払う人</span>
        <select name="payer" defaultValue={cost?.payer === "player" ? (cost.player_id ?? "") : (cost?.payer === "club" ? "club" : "")} className={input}>
          <option value="">未定(試合後に決める)</option>
          <option value="club">部費から</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}さんが立て替え
            </option>
          ))}
        </select>
      </label>
      <input name="memo" maxLength={100} defaultValue={cost?.memo ?? ""} placeholder="メモ(任意)" className={input} />
      <button type="submit" disabled={pending} className="min-h-11 w-full rounded-md bg-brand-600 font-bold text-white disabled:opacity-60">
        {pending ? "保存中…" : cost ? "保存" : "当日のお金を追加"}
      </button>
      {state.message && <p className="text-red-700">{state.message}</p>}
      <p className="text-xs text-slate-500">払う人を決めると、こちらの負担分(総額から相手チームの分を引いた額)が経費に記録されます。</p>
    </form>
  );
}

function DeleteCost({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteGameCost, initial);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("このお金の予定を消します。記録した経費も消えます。よろしいですか?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="min-h-10 w-full rounded-md border border-red-300 text-sm text-red-700">
        消す
      </button>
      {state.message && <p className="text-sm text-red-700">{state.message}</p>}
    </form>
  );
}

// 1件ごとの「直す」
export function CostRowEditor({ gameId, members, cost }: { gameId: string; members: Member[]; cost: GameCost }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="mt-2 space-y-2 rounded-md bg-slate-50 p-3">
      <CostForm gameId={gameId} members={members} cost={cost} onDone={() => setOpen(false)} />
      <DeleteCost id={cost.id} />
      <button type="button" onClick={() => setOpen(false)} className="w-full text-sm text-slate-600">
        閉じる
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="text-sm text-brand-700">
      直す・払う人を決める ›
    </button>
  );
}

export function AddCost({ gameId, members }: { gameId: string; members: Member[] }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
      <CostForm gameId={gameId} members={members} onDone={() => setOpen(false)} />
      <button type="button" onClick={() => setOpen(false)} className="w-full text-sm text-slate-600">
        閉じる
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="min-h-10 w-full rounded-md border border-brand-600 text-sm font-bold text-brand-700">
      ＋ 当日のお金を追加
    </button>
  );
}
