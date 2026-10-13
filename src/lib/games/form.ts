import type { GameResult } from "@/types/database";

export type GameFormValues = {
  gameDate: string;
  opponent: string;
  teamScore: string;
  opponentScore: string;
  result: GameResult | "";
  memo: string;
};

export type GameFormErrors = Partial<Record<keyof GameFormValues, string>>;

export type GameRecord = {
  game_date: string;
  opponent: string | null;
  team_score: number | null;
  opponent_score: number | null;
  result: GameResult;
  memo: string | null;
};

export type ParsedGameForm =
  | { ok: true; values: GameFormValues; record: GameRecord }
  | { ok: false; values: GameFormValues; errors: GameFormErrors };

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
    },
  };
}
