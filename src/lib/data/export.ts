import "server-only";
import { RESULT_LABEL } from "@/lib/batting/entry";
import { CATEGORY_LABEL } from "@/lib/ledger/categories";
import { STAT_COLUMNS } from "@/components/leaderboard/columns";
import { toRow, toTeamRow } from "@/components/leaderboard/build-rows";
import { toCsv } from "@/lib/csv";
import { RESULT_LABEL as GAME_RESULT_LABEL } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "./fetch-all";
import { getSeasonStats } from "./stats";

export const EXPORT_KINDS = {
  stats: "成績一覧(シーズン)",
  "plate-appearances": "打席データ(全試合)",
  participants: "参加者(全試合)",
  games: "試合(全試合)",
  players: "選手",
  ledger: "チーム経費(入出金)",
} as const;
export type ExportKind = keyof typeof EXPORT_KINDS;

const KIND_LABEL = { regular: "正規", guest: "助っ人" } as const;

// 編集者向けの CSV 書き出し(バックアップ用。ID も含める)
export async function buildCsv(kind: ExportKind, season: number): Promise<string> {
  if (kind === "stats") {
    const stats = await getSeasonStats(season);
    const header = ["区分", "背番号", "氏名", ...STAT_COLUMNS.map((c) => c.label)];
    const groups = [
      ["規定到達", stats.qualified],
      ["規定未達", stats.unqualified],
      ["助っ人", stats.guests],
    ] as const;
    const rows: (string | number | null)[][] = groups.flatMap(([label, list]) =>
      list.map((p) => {
        const r = toRow(p, stats.numbers[p.playerId]);
        return [label, r.number, r.name, ...STAT_COLUMNS.map((c) => r.display[c.key])];
      }),
    );
    const team = toTeamRow(stats.teamBatting, stats.team.games);
    rows.push(["チーム計", "", "", ...STAT_COLUMNS.map((c) => team.display[c.key] ?? "")]);
    return toCsv(header, rows);
  }

  const supabase = await createClient();
  const games = await fetchAll((from, to) =>
    supabase
      .from("games")
      .select("id, game_date, opponent, team_score, opponent_score, result, memo")
      .order("game_date")
      .order("id")
      .range(from, to),
  );
  const gameById = new Map(games.map((g) => [g.id, g]));
  const players = await fetchAll((from, to) =>
    supabase.from("players").select("id, full_name, kind, joined_on, left_on").order("created_at").order("id").range(from, to),
  );
  const nameOf = new Map(players.map((p) => [p.id, p.full_name]));

  if (kind === "games") {
    return toCsv(
      ["試合ID", "試合日", "対戦相手", "得点", "失点", "勝敗", "メモ"],
      games.map((g) => [g.id, g.game_date, g.opponent, g.team_score, g.opponent_score, GAME_RESULT_LABEL[g.result], g.memo]),
    );
  }

  if (kind === "ledger") {
    const entries = await fetchAll((from, to) =>
      supabase
        .from("ledger_entries")
        .select("id, entry_date, kind, category, amount, memo, player_id, settled_on, game_id")
        .order("entry_date")
        .order("created_at")
        .range(from, to),
    );
    return toCsv(
      ["記録ID", "日付", "収支", "項目", "金額", "選手", "精算日", "関連する試合", "メモ"],
      entries.map((e) => [
        e.id,
        e.entry_date,
        e.kind === "income" ? "収入" : "支出",
        CATEGORY_LABEL[e.category],
        e.amount,
        e.player_id ? (nameOf.get(e.player_id) ?? "") : e.kind === "expense" ? "部費から直接" : "",
        e.settled_on,
        e.game_id ? (gameById.get(e.game_id)?.game_date ?? "") : "",
        e.memo,
      ]),
    );
  }

  if (kind === "players") {
    return toCsv(
      ["選手ID", "氏名", "区分", "加入日", "退団日"],
      players.map((p) => [p.id, p.full_name, KIND_LABEL[p.kind], p.joined_on, p.left_on]),
    );
  }

  if (kind === "participants") {
    const rows = await fetchAll((from, to) =>
      supabase
        .from("game_participants")
        .select("game_id, player_id, batting_order, extra_stolen_bases")
        .order("game_id")
        .order("player_id")
        .range(from, to),
    );
    return toCsv(
      ["試合ID", "試合日", "選手ID", "氏名", "打順", "打席外の盗塁"],
      rows
        .map((r) => [r.game_id, gameById.get(r.game_id)?.game_date ?? "", r.player_id, nameOf.get(r.player_id) ?? "", r.batting_order, r.extra_stolen_bases] as const)
        .sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
        .map((r) => [...r]),
    );
  }

  const pas = await fetchAll((from, to) =>
    supabase
      .from("plate_appearances")
      .select("game_id, player_id, seq, result, rbi, stolen_bases")
      .order("game_id")
      .order("player_id")
      .order("seq")
      .range(from, to),
  );
  return toCsv(
    ["試合ID", "試合日", "対戦相手", "選手ID", "氏名", "打席目", "結果", "打点", "盗塁"],
    pas
      .map((pa) => {
        const g = gameById.get(pa.game_id);
        return [pa.game_id, g?.game_date ?? "", g?.opponent ?? "", pa.player_id, nameOf.get(pa.player_id) ?? "", pa.seq, RESULT_LABEL[pa.result], pa.rbi, pa.stolen_bases];
      })
      .sort((a, b) => String(a[1]).localeCompare(String(b[1]))),
  );
}
