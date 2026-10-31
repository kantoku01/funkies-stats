import { formatGameDate } from "@/lib/format";
import { defaultMeetTime, formatTime, GAME_HOURS } from "@/lib/games/form";
import { gameTypeLabel, type GameTypeInfo } from "@/lib/games/type-label";
import type { CarpoolGroup } from "@/types/database";

// 試合前日に LINE で送る連絡の文面を作る。アプリに登録している試合情報を全部入れる

export type LineMessageGame = GameTypeInfo & {
  game_date: string;
  opponent: string | null;
  start_time: string | null;
  meet_time: string | null;
  venue: string | null;
  uniform: string | null;
  bring_bases: boolean | null;
  memo: string | null;
};

// 参加する人(○と△)。名前はフルネーム
export type LineMessageMember = { id: string; fullName: string; kind: "regular" | "manager"; carpool: CarpoolGroup | null };

const CARPOOL_SECTIONS: [CarpoolGroup, string][] = [
  ["A", "☆配車グループA"],
  ["B", "☆配車グループB"],
  ["individual", "☆個別"],
];

// 文面の名前は名字だけ。名字が同じ人がいれば「森(陽)」のように名前の1文字目を付ける
export function shortNames(fullNames: { id: string; fullName: string }[]): Map<string, string> {
  const split = fullNames.map((p) => {
    const [family, ...given] = p.fullName.trim().split(/[\s　]+/);
    return { id: p.id, family, given: given.join("") };
  });
  const count = new Map<string, number>();
  for (const p of split) count.set(p.family, (count.get(p.family) ?? 0) + 1);
  return new Map(
    split.map((p) => [p.id, (count.get(p.family) ?? 0) > 1 && p.given ? `${p.family}(${p.given.slice(0, 1)})` : p.family]),
  );
}

// "13:00:00" に2時間足して "15:00"
function endTime(start: string): string {
  const [h, m] = start.split(":");
  return `${(Number(h) + GAME_HOURS) % 24}:${m}`;
}

// members は背番号順など並べたい順で渡す。names は shortNames の結果(チーム全員から作ると、名字の重なりが試合ごとに変わらない)
export function buildLineMessage(g: LineMessageGame, members: LineMessageMember[], names: Map<string, string>): string {
  const name = (m: LineMessageMember) => names.get(m.id) ?? m.fullName;
  const title = [formatGameDate(g.game_date), gameTypeLabel(g), `vs ${g.opponent ?? "相手未定"}`].join(" ");

  const meet = g.meet_time ?? (g.start_time ? defaultMeetTime(g.start_time) : null);
  const schedule = g.start_time
    ? [`${formatTime(meet)} 球場集合`, `${formatTime(g.start_time)} 試合開始`, `${endTime(g.start_time)} 試合終了`]
    : ["未定"];

  const managers = members.filter((m) => m.kind === "manager").map(name);
  const players = members.filter((m) => m.kind === "regular");
  const carpool = CARPOOL_SECTIONS.map(([group, heading]) => {
    // 配車が未設定の人は個別に入れる
    const who = players.filter((p) => (p.carpool ?? "individual") === group).map(name);
    return [heading, ...(who.length > 0 ? who : ["なし"])].join("\n");
  });

  const sections = [
    title,
    ["◆球場", g.venue ?? "未定"],
    ["◆スケジュール", ...schedule],
    ["◆ユニフォーム", g.uniform ?? "未定"],
    ["◆ベース", g.bring_bases === null ? "未定" : g.bring_bases ? "必要" : "不要"],
    ["◆マネージャー", managers.length > 0 ? managers.join("、") : "無し"],
    ["◆配車", carpool.join("\n\n")],
    ...(g.memo ? [["◆メモ", g.memo]] : []),
  ];
  return sections.map((s) => (Array.isArray(s) ? s.join("\n") : s)).join("\n\n");
}
