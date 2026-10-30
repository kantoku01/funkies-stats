import type { Metadata } from "next";
import Link from "next/link";
import { getParticipantsForAdmin } from "@/lib/data/games";
import { getPlayersForAdmin } from "@/lib/data/players";
import { formatGameDate } from "@/lib/format";
import { enrolledOn } from "@/lib/games/participants";
import { resolveNumber } from "@/lib/stats";
import { loadGame } from "../../load-game";
import { ParticipantsForm, type Candidate } from "./participants-form";

export const metadata: Metadata = { title: "参加者登録" };

export default async function ParticipantsPage({ params }: PageProps<"/admin/games/[id]/participants">) {
  const { id } = await params;
  const [game, participants, { players, numbers }] = await Promise.all([
    loadGame(id),
    getParticipantsForAdmin(id),
    getPlayersForAdmin(),
  ]);
  const registered = new Map(participants.map((p) => [p.player_id, p]));

  // 候補: 試合日に在籍している正規メンバー + 助っ人 + すでに登録済みの選手
  const candidates: Candidate[] = players
    .filter((p) => p.kind === "guest" || enrolledOn(p, game.game_date) || registered.has(p.id))
    .map((p) => {
      const r = registered.get(p.id);
      return {
        playerId: p.id,
        name: p.full_name,
        number: p.kind === "guest" ? "助" : (resolveNumber(numbers, p.id, game.season) ?? ""),
        note: p.kind === "regular" && !enrolledOn(p, game.game_date) ? "在籍期間外" : null,
        registered: Boolean(r),
        battingOrder: r?.batting_order?.toString() ?? "",
        paCount: r?.paCount ?? 0,
      };
    })
    .sort(byNumberThenName);

  return (
    <section className="space-y-4">
      <Link href={`/admin/games/${game.id}`} className="text-sm text-brand-700">
        ‹ 試合に戻る
      </Link>
      <div>
        <h1 className="text-xl font-bold">参加者登録</h1>
        <p className="text-sm text-slate-600">
          {formatGameDate(game.game_date)} {game.opponent ?? ""}
          ・出席した選手にチェックを入れてください。打順は任意です。
        </p>
      </div>
      <ParticipantsForm
        gameId={game.id}
        candidates={candidates}
      />
    </section>
  );
}

// 正規メンバー(背番号順、番号なしは後ろ)→ 助っ人(名前順)
function byNumberThenName(a: Candidate, b: Candidate): number {
  const rank = (c: Candidate) => (c.number === "助" ? 2 : c.number === "" ? 1 : 0);
  return (
    rank(a) - rank(b) ||
    (rank(a) === 0 ? Number(a.number) - Number(b.number) || a.number.length - b.number.length : 0) ||
    a.name.localeCompare(b.name, "ja")
  );
}
