import { RESULT_LABEL } from "@/lib/format";
import type { GameResult } from "@/types/database";

// 勝ち=赤 / 負け=青 / 引分=灰
const STYLE: Record<GameResult, string> = {
  win: "bg-red-600 text-white",
  lose: "bg-blue-700 text-white",
  draw: "bg-slate-400 text-white",
};

export function GameResultBadge({ result }: { result: GameResult }) {
  return (
    <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${STYLE[result]}`}>
      {RESULT_LABEL[result]}
    </span>
  );
}

export function formatScore(team: number | null, opponent: number | null): string {
  return team === null && opponent === null ? "−" : `${team ?? "−"} - ${opponent ?? "−"}`;
}
