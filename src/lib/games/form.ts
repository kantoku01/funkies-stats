import type { GameResult, GameStage, GameStatus, GameType } from "@/types/database";

export type GameFormValues = {
  status: GameStatus; // 予定 / 終了(結果あり) / 雨天中止
  gameDate: string;
  startTime: string; // "09:00"
  meetTime: string;
  venue: string;
  venueMapUrl: string; // Google マップの URL(任意)
  uniform: string;
  bringBases: "" | "need" | "none"; // ベース持参: 必要 / 不要 / 未定
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
  costs?: string; // 試合予定の追加でまとめて入れる当日のお金(JSON)。入力エラーで戻るときに残す
};

export type GameFormErrors = Partial<Record<keyof GameFormValues, string>>;

export type GameRecord = {
  status: GameStatus;
  start_time: string | null;
  meet_time: string | null;
  venue: string | null;
  venue_map_url: string | null;
  uniform: string | null;
  bring_bases: boolean | null;
  game_date: string;
  opponent: string | null;
  team_score: number | null;
  opponent_score: number | null;
  result: GameResult | null;
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

// "9:00" / "09:00" / "9時" を受け付ける
function isValidTime(s: string): boolean {
  const m = /^(\d{1,2})[:時](\d{2})?分?$/.exec(s);
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  return h <= 23 && min <= 59;
}

// "9:00" → "09:00"
export function normalizeTime(s: string): string {
  const m = /^(\d{1,2})[:時](\d{2})?/.exec(s)!;
  return `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`;
}

// DB の "09:00:00" → 画面の "9:00"
export function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  return `${Number(h)}:${m}`;
}

// 集合は基本、試合開始の50分前。"13:00" / "13:00:00" → "12:10"
export const MEET_BEFORE_MINUTES = 50;
export function defaultMeetTime(start: string): string {
  const [h, m] = start.split(":").map(Number);
  const t = (h * 60 + m - MEET_BEFORE_MINUTES + 24 * 60) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

// ユニフォームは青か黒(未定なら空)
export const UNIFORM_COLORS = ["青", "黒"] as const;

// 試合はすべて2時間。開始時間から「13:00〜15:00」を作る
export const GAME_HOURS = 2;
export function formatGameTime(start: string | null): string {
  if (!start) return "";
  const [h, m] = start.split(":");
  return `${formatTime(start)}〜${(Number(h) + GAME_HOURS) % 24}:${m}`;
}

// 大会名には年度を付ける(「スカイカップ」→「2026スカイカップ」)。付いていればそのまま
export function tournamentNameWithYear(name: string, season: number): string {
  return name.startsWith(String(season)) ? name : `${season}${name}`;
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
  const bases = str("bringBases");
  const values: GameFormValues = {
    status: str("status") === "scheduled" ? "scheduled" : str("status") === "cancelled" ? "cancelled" : "completed",
    gameDate: str("gameDate"),
    startTime: toHalfWidth(str("startTime")),
    meetTime: toHalfWidth(str("meetTime")),
    venue: str("venue").replace(/[\s　]+/g, " "),
    venueMapUrl: str("venueMapUrl"),
    uniform: str("uniform"),
    bringBases: bases === "need" || bases === "none" ? bases : "",
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
    costs: String(formData.get("costs") ?? ""),
  };
  const errors: GameFormErrors = {};

  if (!values.gameDate) errors.gameDate = "試合日を入力してください。";
  else if (!isValidDate(values.gameDate)) errors.gameDate = "日付の形式が正しくありません。";

  if (values.opponent.length > 40) errors.opponent = "対戦相手は40文字以内で入力してください。";

  const completed = values.status === "completed";
  if (completed) {
    for (const key of ["teamScore", "opponentScore"] as const) {
      if (values[key] !== "" && !/^\d{1,3}$/.test(values[key])) errors[key] = "0以上の数字で入力してください。";
    }
    if (!values.result) errors.result = "勝敗を選んでください。";
    else if (!errors.teamScore && !errors.opponentScore) {
      const fromScores = resultFromScores(values.teamScore, values.opponentScore);
      if (fromScores && fromScores !== values.result) errors.result = "スコアと勝敗が合っていません。";
    }
  }

  for (const key of ["startTime", "meetTime"] as const) {
    if (values[key] !== "" && !isValidTime(values[key])) errors[key] = "時刻は 9:00 のように入力してください。";
  }
  if (values.venue.length > 60) errors.venue = "場所は60文字以内で入力してください。";
  if (values.venueMapUrl && (!/^https?:\/\/\S+$/.test(values.venueMapUrl) || values.venueMapUrl.length > 500)) {
    errors.venueMapUrl = "Google マップの URL(https:// で始まるもの)を貼り付けてください。";
  }
  if (values.uniform !== "" && !(UNIFORM_COLORS as readonly string[]).includes(values.uniform)) errors.uniform = "ユニフォームは青か黒を選んでください。";

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
      status: values.status,
      start_time: values.startTime ? normalizeTime(values.startTime) : null,
      // 集合時間が空なら開始の50分前
      meet_time: values.meetTime
        ? normalizeTime(values.meetTime)
        : values.startTime
          ? defaultMeetTime(normalizeTime(values.startTime))
          : null,
      venue: values.venue || null,
      venue_map_url: values.venueMapUrl || null,
      uniform: values.uniform || null,
      bring_bases: values.bringBases === "" ? null : values.bringBases === "need",
      game_date: values.gameDate,
      opponent: values.opponent || null,
      // 予定・雨天中止の試合はスコアと勝敗を持たない
      team_score: completed && values.teamScore !== "" ? Number(values.teamScore) : null,
      opponent_score: completed && values.opponentScore !== "" ? Number(values.opponentScore) : null,
      result: completed ? (values.result as GameResult) : null,
      memo: values.memo || null,
      game_type: values.gameType,
      stage: values.gameType === "official" ? (values.stage as GameStage) : null,
      round_label: values.gameType === "official" ? values.roundLabel || null : null,
    },
    tournament,
  };
}
