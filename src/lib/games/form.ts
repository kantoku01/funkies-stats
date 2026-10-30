import type { GameResult, GameStage, GameType } from "@/types/database";

export type GameFormValues = {
  gameDate: string;
  opponent: string;
  teamScore: string;
  opponentScore: string;
  result: GameResult | "";
  memo: string;
  gameType: GameType;
  tournamentId: string; // 既存の大会の ID、または "new"(新しい大会を作る)
  newTournament: string;
  stage: GameStage | "";
  roundLabel: string;
};

export type GameFormErrors = Partial<Record<keyof GameFormValues, string>>;

export type GameRecord = {
  game_date: string;
  opponent: string | null;
  team_score: number | null;
  opponent_score: number | null;
  result: GameResult;
  memo: string | null;
  game_type: GameType;
  stage: GameStage | null;
  round_label: string | null;
};

// 公式戦の大会: 既存の大会か、新しく作る大会の名前
export type TournamentChoice = { id: string } | { newName: string } | null;

export type ParsedGameForm =
  | { ok: true; values: GameFormValues; record: GameRecord; tournament: TournamentChoice }
  | { ok: false; values: GameFormValues; errors: GameFormErrors };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toHalfWidth = (s: string) => s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// 得点から勝敗を決める(両方入っているときだけ)
export function resultFromScores(team: string, opponent: string): GameResult | null {
  if (team === "" || opponent === "") return null;
  const t = Number(team);
  const o = Number(opponent);
  if (!Number.isInteger(t) || !Number.isInteger(o)) return null;
  return t > o ? "win" : t < o ? "lose" : "draw";
}

export function parseGameForm(formData: FormData): ParsedGameForm {
  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const resultRaw = str("result");
  const values: GameFormValues = {
    gameDate: str("gameDate"),
    opponent: str("opponent").replace(/[\s　]+/g, " "),
    teamScore: toHalfWidth(str("teamScore")),
    opponentScore: toHalfWidth(str("opponentScore")),
    result: resultRaw === "win" || resultRaw === "lose" || resultRaw === "draw" ? resultRaw : "",
    memo: str("memo"),
    gameType: str("gameType") === "official" ? "official" : "open",
    tournamentId: str("tournamentId"),
    newTournament: str("newTournament").replace(/[\s　]+/g, " "),
    stage: str("stage") === "league" || str("stage") === "knockout" ? (str("stage") as GameStage) : "",
    roundLabel: str("roundLabel"),
  };
  const errors: GameFormErrors = {};

  if (!values.gameDate) errors.gameDate = "試合日を入力してください。";
  else if (!isValidDate(values.gameDate)) errors.gameDate = "日付の形式が正しくありません。";

  if (values.opponent.length > 40) errors.opponent = "対戦相手は40文字以内で入力してください。";

  for (const key of ["teamScore", "opponentScore"] as const) {
    if (values[key] !== "" && !/^\d{1,3}$/.test(values[key])) errors[key] = "0以上の数字で入力してください。";
  }

  if (!values.result) errors.result = "勝敗を選んでください。";
  else if (!errors.teamScore && !errors.opponentScore) {
    const fromScores = resultFromScores(values.teamScore, values.opponentScore);
    if (fromScores && fromScores !== values.result) errors.result = "スコアと勝敗が合っていません。";
  }

  if (values.memo.length > 200) errors.memo = "メモは200文字以内で入力してください。";

  // 公式戦は大会と段階が必要。回戦は任意
  let tournament: TournamentChoice = null;
  if (values.gameType === "official") {
    if (values.tournamentId === "new") {
      if (!values.newTournament) errors.newTournament = "大会名を入力してください。";
      else if (values.newTournament.length > 60) errors.newTournament = "大会名は60文字以内で入力してください。";
      else tournament = { newName: values.newTournament };
    } else if (UUID.test(values.tournamentId)) {
      tournament = { id: values.tournamentId };
    } else {
      errors.tournamentId = "大会を選んでください。";
    }
    if (!values.stage) errors.stage = "予選リーグか決勝トーナメントかを選んでください。";
    if (values.roundLabel.length > 30) errors.roundLabel = "回戦は30文字以内で入力してください。";
  }

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      game_date: values.gameDate,
      opponent: values.opponent || null,
      team_score: values.teamScore === "" ? null : Number(values.teamScore),
      opponent_score: values.opponentScore === "" ? null : Number(values.opponentScore),
      result: values.result as GameResult,
      memo: values.memo || null,
      game_type: values.gameType,
      stage: values.gameType === "official" ? (values.stage as GameStage) : null,
      round_label: values.gameType === "official" ? values.roundLabel || null : null,
    },
    tournament,
  };
}
