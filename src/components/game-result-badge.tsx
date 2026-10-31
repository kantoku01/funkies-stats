import { RESULT_LABEL } from "@/lib/format";
import type { GameResult, GameStatus } from "@/types/database";

// 勝ち=赤 / 負け=青 / 引分=灰
const STYLE: Record<GameResult, string> = {
  win: "bg-red-600 text-white",
  lose: "bg-blue-700 text-white",
  draw: "bg-slate-400 text-white",
};

// 予定の試合(結果なし)は「予」を白抜き、雨天中止は「中」を灰色の白抜きで出す
export function GameResultBadge({ result, status }: { result: GameResult | null; status?: GameStatus }) {
  if (status === "cancelled") {
    return (
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-slate-400 text-xs font-bold text-slate-500">
        中
      </span>
    );
  }
  if (result === null) {
    return (
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-brand-600 text-xs font-bold text-brand-700">
        予
      </span>
    );
  }
  return (
    <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${STYLE[result]}`}>
      {RESULT_LABEL[result]}
    </span>
  );
}

export function formatScore(team: number | null, opponent: number | null): string {
  return team === null && opponent === null ? "−" : `${team ?? "−"} - ${opponent ?? "−"}`;
}
