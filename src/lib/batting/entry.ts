import { battingLine, countsFromGame } from "@/lib/stats";
import type { PlateAppearanceResult } from "@/types/database";

// 打撃入力画面で扱う1打席
export type BattingEntry = { result: PlateAppearanceResult; rbi: number; stolenBases: number };

export const MAX_RBI = 4;
export const MAX_STOLEN_BASES = 3;
export const MAX_EXTRA_STOLEN_BASES = 3;
export const MAX_PLATE_APPEARANCES = 15; // 保存できる上限(警告は7を超えたら)
export const WARN_PLATE_APPEARANCES = 7;

// ボタンの並び(3列)
export const RESULT_BUTTONS: { result: PlateAppearanceResult; label: string; kind: "hit" | "walk" | "out" }[] = [
  { result: "single", label: "単打", kind: "hit" },
  { result: "double", label: "二塁打", kind: "hit" },
  { result: "triple", label: "三塁打", kind: "hit" },
  { result: "home_run", label: "本塁打", kind: "hit" },
  { result: "walk", label: "四球", kind: "walk" },
  { result: "hbp", label: "死球", kind: "walk" },
  { result: "sac_fly", label: "犠飛", kind: "walk" },
  { result: "sac_bunt", label: "犠打", kind: "walk" },
  { result: "out", label: "凡退", kind: "out" },
];

export const RESULT_LABEL = Object.fromEntries(RESULT_BUTTONS.map((b) => [b.result, b.label])) as Record<
  PlateAppearanceResult,
  string
>;

// 表の中で使う短い表記
export const RESULT_SHORT: Record<PlateAppearanceResult, string> = {
  single: "単",
  double: "二",
  triple: "三",
  home_run: "本",
  walk: "四",
  hbp: "死",
  sac_fly: "犠飛",
  sac_bunt: "犠打",
  out: "凡",
};

export const RESULT_KIND = Object.fromEntries(RESULT_BUTTONS.map((b) => [b.result, b.kind])) as Record<
  PlateAppearanceResult,
  "hit" | "walk" | "out"
>;

// 入力チェック(警告のみ。保存はできる)
export function battingWarnings(entries: BattingEntry[]): string[] {
  const warnings: string[] = [];
  entries.forEach((e, i) => {
    if (e.result === "home_run" && e.rbi === 0) warnings.push(`${i + 1}打席目: 本塁打なのに打点が0です`);
    if (e.result === "sac_fly" && e.rbi === 0) warnings.push(`${i + 1}打席目: 犠飛なのに打点が0です`);
  });
  if (entries.length > WARN_PLATE_APPEARANCES) warnings.push(`打席数が${entries.length}あります(7を超えています)`);
  return warnings;
}

// 「4打数2安打1打点1盗塁」
export function battingSummary(entries: BattingEntry[], extraStolenBases: number): string {
  const line = battingLine(
    countsFromGame(
      entries.map((e) => ({ result: e.result, rbi: e.rbi, stolen_bases: e.stolenBases })),
      extraStolenBases,
    ),
  );
  if (line.pa === 0 && line.stolenBases === 0) return "打席なし";
  const parts = [`${line.atBats}打数${line.hits}安打`];
  if (line.homeRuns > 0) parts.push(`${line.homeRuns}本塁打`);
  if (line.rbi > 0) parts.push(`${line.rbi}打点`);
  if (line.stolenBases > 0) parts.push(`${line.stolenBases}盗塁`);
  const extras = [
    [line.walks, "四球"],
    [line.hbp, "死球"],
    [line.sacFlies, "犠飛"],
    [line.sacBunts, "犠打"],
  ] as const;
  for (const [n, label] of extras) if (n > 0) parts.push(`${n}${label}`);
  return parts.join("");
}

// サーバー側で受け取った値の確認(画面を通さない呼び出しにも備える)
export function validateBattingInput(
  entries: unknown,
  extraStolenBases: unknown,
): { ok: true; entries: BattingEntry[]; extraStolenBases: number } | { ok: false; error: string } {
  if (!Array.isArray(entries) || entries.length > MAX_PLATE_APPEARANCES) {
    return { ok: false, error: `打席は${MAX_PLATE_APPEARANCES}までです。` };
  }
  const valid = new Set(RESULT_BUTTONS.map((b) => b.result));
  const out: BattingEntry[] = [];
  for (const e of entries) {
    const x = e as Partial<BattingEntry>;
    if (
      !x ||
      !valid.has(x.result as PlateAppearanceResult) ||
      !Number.isInteger(x.rbi) ||
      x.rbi! < 0 ||
      x.rbi! > MAX_RBI ||
      !Number.isInteger(x.stolenBases) ||
      x.stolenBases! < 0 ||
      x.stolenBases! > MAX_STOLEN_BASES
    ) {
      return { ok: false, error: "打席結果の内容が正しくありません。" };
    }
    out.push({ result: x.result as PlateAppearanceResult, rbi: x.rbi!, stolenBases: x.stolenBases! });
  }
  if (
    !Number.isInteger(extraStolenBases) ||
    (extraStolenBases as number) < 0 ||
    (extraStolenBases as number) > MAX_EXTRA_STOLEN_BASES
  ) {
    return { ok: false, error: "打席外の盗塁の数が正しくありません。" };
  }
  return { ok: true, entries: out, extraStolenBases: extraStolenBases as number };
}

// 入力する順番: 打順が入っていれば打順順、なければ背番号順(助っ人は後ろ)
export function battingOrderSort<T extends { battingOrder: number | null; number: string; name: string }>(list: T[]): T[] {
  const numRank = (n: string) => (n === "" || n === "助" ? 1 : 0);
  return [...list].sort(
    (a, b) =>
      (a.battingOrder === null ? 1 : 0) - (b.battingOrder === null ? 1 : 0) ||
      (a.battingOrder ?? 0) - (b.battingOrder ?? 0) ||
      numRank(a.number) - numRank(b.number) ||
      (numRank(a.number) === 0 ? Number(a.number) - Number(b.number) || a.number.length - b.number.length : 0) ||
      a.name.localeCompare(b.name, "ja"),
  );
}
