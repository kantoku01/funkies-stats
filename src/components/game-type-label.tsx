import { gameTypeLabel, type GameTypeInfo } from "@/lib/games/type-label";

// 試合の種類の小さな札。公式戦はピンク、オープン戦は灰色
export function GameTypeLabel({ game, className = "" }: { game: GameTypeInfo; className?: string }) {
  const official = game.game_type === "official";
  return (
    <span
      className={`inline-block max-w-full rounded px-1.5 py-0.5 text-[11px] font-bold leading-tight ${
        official ? "bg-accent-500/10 text-accent-600" : "bg-slate-100 text-slate-500"
      } ${className}`}
    >
      {gameTypeLabel(game)}
    </span>
  );
}
