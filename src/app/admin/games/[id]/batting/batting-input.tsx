"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  battingSummary,
  battingWarnings,
  MAX_EXTRA_STOLEN_BASES,
  MAX_PLATE_APPEARANCES,
  MAX_RBI,
  MAX_STOLEN_BASES,
  RESULT_BUTTONS,
  RESULT_LABEL,
  type BattingEntry,
} from "@/lib/batting/entry";
import type { PlateAppearanceResult } from "@/types/database";
import { savePlayerBatting } from "../../batting-actions";

export type BattingPlayer = { playerId: string; name: string; number: string; battingOrder: number | null };
type PlayerData = { entries: BattingEntry[]; extra: number };

type Props = {
  gameId: string;
  players: BattingPlayer[]; // 入力する順に並べ済み
  initial: Record<string, PlayerData>;
  startPlayerId: string | null;
  finishHref: string;
};

const snapshot = (d: PlayerData) => JSON.stringify(d);

const BUTTON_STYLE: Record<"hit" | "walk" | "out", string> = {
  hit: "bg-blue-900 text-white active:bg-blue-950",
  walk: "bg-emerald-700 text-white active:bg-emerald-800",
  out: "bg-slate-600 text-white active:bg-slate-700",
};

export function BattingInput({ gameId, players, initial, startPlayerId, finishHref }: Props) {
  const router = useRouter();
  const [data, setData] = useState<Record<string, PlayerData>>(initial);
  // 保存済みの内容(これと違えば「未保存」)
  const [saved, setSaved] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(initial).map(([id, d]) => [id, snapshot(d)])),
  );
  // 入力済みの選手(打席がある、またはこの画面で確認して次へ進んだ)
  const [done, setDone] = useState<Set<string>>(
    () => new Set(Object.entries(initial).filter(([, d]) => d.entries.length > 0 || d.extra > 0).map(([id]) => id)),
  );
  const [index, setIndex] = useState(() => {
    const i = players.findIndex((p) => p.playerId === startPlayerId);
    return i >= 0 ? i : 0;
  });
  const [editing, setEditing] = useState<number | null>(null); // 結果を変更中の打席
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const player = players[index];
  const current = data[player.playerId];
  const dirty = (id: string) => snapshot(data[id]) !== saved[id];
  const anyDirty = players.some((p) => dirty(p.playerId));

  const update = (fn: (d: PlayerData) => PlayerData) => {
    setError(null);
    setData((prev) => ({ ...prev, [player.playerId]: fn(prev[player.playerId]) }));
  };

  // ---- 打席の操作 ----
  const onResult = (result: PlateAppearanceResult) => {
    if (editing !== null) {
      const i = editing;
      update((d) => ({ ...d, entries: d.entries.map((e, j) => (j === i ? { ...e, result } : e)) }));
      setEditing(null);
      setLastAdded(i);
      return;
    }
    if (current.entries.length >= MAX_PLATE_APPEARANCES) return;
    update((d) => ({ ...d, entries: [...d.entries, { result, rbi: 0, stolenBases: 0 }] }));
    setLastAdded(current.entries.length);
  };
  const changeCount = (i: number, key: "rbi" | "stolenBases", delta: number) => {
    const max = key === "rbi" ? MAX_RBI : MAX_STOLEN_BASES;
    update((d) => ({
      ...d,
      entries: d.entries.map((e, j) => (j === i ? { ...e, [key]: Math.min(max, Math.max(0, e[key] + delta)) } : e)),
    }));
  };
  const removeEntry = (i: number) => {
    if (!window.confirm(`${i + 1}打席目(${RESULT_LABEL[current.entries[i].result]})を削除しますか?`)) return;
    update((d) => ({ ...d, entries: d.entries.filter((_, j) => j !== i) }));
    setEditing(null);
    setLastAdded(null);
  };
  const changeExtra = (delta: number) =>
    update((d) => ({ ...d, extra: Math.min(MAX_EXTRA_STOLEN_BASES, Math.max(0, d.extra + delta)) }));

  // ---- 保存と選手の切り替え ----
  const saveCurrent = useCallback(async (): Promise<boolean> => {
    const id = player.playerId;
    const d = data[id];
    if (snapshot(d) === saved[id]) return true;
    const result = await savePlayerBatting(gameId, id, d.entries, d.extra);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setSaved((prev) => ({ ...prev, [id]: snapshot(d) }));
    return true;
  }, [data, saved, gameId, player.playerId]);

  const goTo = (next: number) => {
    if (pending || next === index) return;
    startTransition(async () => {
      if (!(await saveCurrent())) return;
      setDone((prev) => new Set(prev).add(player.playerId));
      setIndex(next);
      setEditing(null);
      setLastAdded(null);
      window.scrollTo({ top: 0 });
    });
  };

  const finish = () => {
    if (pending) return;
    startTransition(async () => {
      if (!(await saveCurrent())) return;
      router.push(finishHref);
    });
  };

  // ---- 未保存のまま離れようとしたら警告する ----
  const dirtyRef = useRef(anyDirty);
  useEffect(() => {
    dirtyRef.current = anyDirty;
  }, [anyDirty]);
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    // 画面内のリンク(ヘッダーなど)で移動するときも確認する
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || !dirtyRef.current) return;
      if (!window.confirm("保存していない打席結果があります。このページを離れますか?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  // アプリを切り替えたとき(画面が隠れたとき)にも保存しておく
  const saveRef = useRef(saveCurrent);
  useEffect(() => {
    saveRef.current = saveCurrent;
  }, [saveCurrent]);
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirtyRef.current) void saveRef.current();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const warnings = useMemo(() => battingWarnings(current.entries), [current.entries]);
  const summary = battingSummary(current.entries, current.extra);
  const isLast = index === players.length - 1;
  const status = pending
    ? "保存中…"
    : dirty(player.playerId)
      ? "未保存(次の選手へ進むと保存されます)"
      : "保存済み";

  // 新しい打席を上に表示し、直前に追加した行の + ボタンが結果ボタンのすぐ下に来るようにする
  const rows = current.entries.map((e, i) => ({ e, i })).reverse();

  return (
    <div className="space-y-4 pb-24">
      {/* 1. ヘッダー */}
      <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-2 py-1 backdrop-blur">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0 || pending}
          className="min-h-11 min-w-14 rounded-md text-sm text-blue-900 disabled:text-slate-300"
        >
          ‹ 前
        </button>
        <div className="flex-1 text-center">
          <p className="text-lg font-bold leading-tight">
            <span className="mr-2 tabular-nums text-slate-500">{player.number}</span>
            {player.name}
          </p>
          <p className="text-xs text-slate-500">
            {index + 1}/{players.length}人目
            {player.battingOrder !== null && ` ・ ${player.battingOrder}番`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={isLast || pending}
          className="min-h-11 min-w-14 rounded-md text-sm text-blue-900 disabled:text-slate-300"
        >
          次 ›
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {/* 2. 打席結果ボタン(3列) */}
      {editing !== null && (
        <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>{editing + 1}打席目の結果を選び直してください</span>
          <button type="button" onClick={() => setEditing(null)} className="min-h-11 px-2 underline">
            やめる
          </button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {RESULT_BUTTONS.map((b) => (
          <button
            key={b.result}
            type="button"
            onClick={() => onResult(b.result)}
            disabled={pending || (editing === null && current.entries.length >= MAX_PLATE_APPEARANCES)}
            className={`min-h-14 rounded-lg text-base font-bold shadow-sm disabled:opacity-40 ${BUTTON_STYLE[b.kind]}`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* 3. 打席リスト(打点・盗塁の + はすぐ押せる大きさ) */}
      {rows.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {rows.map(({ e, i }) => (
            <li
              key={i}
              className={`flex items-center gap-1 px-2 py-1.5 ${
                editing === i ? "bg-amber-50" : lastAdded === i ? "bg-blue-50" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setEditing(editing === i ? null : i)}
                className="min-h-11 flex-1 text-left"
                aria-label={`${i + 1}打席目 ${RESULT_LABEL[e.result]}(タップで結果を変更)`}
              >
                <span className="block text-xs text-slate-500">{i + 1}打席目</span>
                <span className="font-bold">{RESULT_LABEL[e.result]}</span>
              </button>
              <Counter
                label="打点"
                value={e.rbi}
                max={MAX_RBI}
                onChange={(d) => changeCount(i, "rbi", d)}
                disabled={pending}
              />
              <Counter
                label="盗塁"
                value={e.stolenBases}
                max={MAX_STOLEN_BASES}
                onChange={(d) => changeCount(i, "stolenBases", d)}
                disabled={pending}
              />
              <button
                type="button"
                onClick={() => removeEntry(i)}
                disabled={pending}
                aria-label={`${i + 1}打席目を削除`}
                className="size-8 shrink-0 rounded text-lg text-slate-400"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 4. 打席外の盗塁(代走など) */}
      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-1.5">
        <span className="text-sm">打席外の盗塁(代走など)</span>
        <Counter label="" value={current.extra} max={MAX_EXTRA_STOLEN_BASES} onChange={changeExtra} disabled={pending} />
      </div>

      {/* 入力チェック(警告のみ) */}
      {warnings.length > 0 && (
        <ul className="space-y-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      )}

      {/* 5. サマリー */}
      <div className="text-center">
        <p className="text-xl font-bold">{summary}</p>
        <p className={`text-xs ${dirty(player.playerId) ? "text-amber-700" : "text-slate-500"}`}>{status}</p>
      </div>

      {/* 6. 参加者一覧 */}
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-slate-600">参加者</h2>
        <ul className="grid grid-cols-3 gap-1.5">
          {players.map((p, i) => {
            const state =
              i === index ? "current" : dirty(p.playerId) ? "dirty" : done.has(p.playerId) ? "done" : "todo";
            return (
              <li key={p.playerId}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  disabled={pending}
                  aria-current={i === index ? "true" : undefined}
                  className={`flex min-h-11 w-full items-center gap-1 rounded-md border px-2 text-left text-sm ${
                    state === "current"
                      ? "border-blue-900 bg-blue-900 text-white"
                      : state === "done"
                        ? "border-emerald-300 bg-emerald-50"
                        : state === "dirty"
                          ? "border-amber-400 bg-amber-50"
                          : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <span className="w-5 shrink-0 text-xs tabular-nums opacity-70">{p.number}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  {state === "done" && <span aria-label="入力済み" className="text-emerald-700">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-slate-500">✓ 入力済み ・ 白 未入力</p>
      </div>

      {/* 主要操作は画面下部に固定 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={isLast ? finish : () => goTo(index + 1)}
            disabled={pending}
            className="min-h-12 w-full rounded-md bg-blue-900 text-lg font-bold text-white disabled:opacity-60"
          >
            {pending ? "保存中…" : isLast ? "保存して終了" : `次の選手へ(${players[index + 1].name})›`}
          </button>
        </div>
      </div>
    </div>
  );
}

// − 値 + (+ は大きく、− は誤タップしにくいよう小さく)
function Counter({
  label,
  value,
  max,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (delta: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={() => onChange(-1)}
        disabled={disabled || value === 0}
        aria-label={`${label}を減らす`}
        className="size-7 rounded text-slate-500 disabled:text-slate-200"
      >
        −
      </button>
      <span className="w-7 text-center leading-tight">
        {label && <span className="block text-[10px] text-slate-500">{label}</span>}
        <span className="font-bold tabular-nums">{value}</span>
      </span>
      <button
        type="button"
        onClick={() => onChange(1)}
        disabled={disabled || value >= max}
        aria-label={`${label}を増やす`}
        className="size-11 rounded-md bg-slate-100 text-xl font-bold text-blue-900 active:bg-slate-200 disabled:text-slate-300"
      >
        +
      </button>
    </div>
  );
}
