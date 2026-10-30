// 月ごとの予定・出欠ページで使う日付の計算(日付は日本の暦日 "YYYY-MM-DD" の文字列で扱う)

export type Answer = "yes" | "maybe" | "no";
export const ANSWER_MARK: Record<Answer, string> = { yes: "○", maybe: "△", no: "×" };
export const ANSWER_LABEL: Record<Answer, string> = { yes: "参加", maybe: "未定", no: "不参加" };

export type Month = { year: number; month: number }; // month は 1〜12

// "2026-11" → { year: 2026, month: 11 }
export function parseMonth(value: string): Month | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

export const monthKey = ({ year, month }: Month) => `${year}-${String(month).padStart(2, "0")}`;
export const monthLabel = ({ year, month }: Month) => `${year}年${month}月`;

export function shiftMonth({ year, month }: Month, delta: number): Month {
  const i = year * 12 + (month - 1) + delta;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
}

// その月の最初と最後の日
export function monthRange({ year, month }: Month): { first: string; last: string } {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return { first: `${year}-${mm}-01`, last: `${year}-${mm}-${String(last).padStart(2, "0")}` };
}

// その月の日曜日
export function sundaysOf({ year, month }: Month): string[] {
  const days: string[] = [];
  const d = new Date(Date.UTC(year, month - 1, 1));
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCMonth() === month - 1) {
    days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return days;
}

// ページに並べる日付: 日曜 + 足した日付(重複なし、日付順)
export function scheduleDays(m: Month, extraDays: string[]): string[] {
  const { first, last } = monthRange(m);
  const extras = extraDays.filter((d) => d >= first && d <= last);
  return [...new Set([...sundaysOf(m), ...extras])].sort();
}

export const isSunday = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay() === 0;

// 日付ごとの集計
export function countAnswers(answers: { answer: Answer }[]): Record<Answer, number> {
  const c: Record<Answer, number> = { yes: 0, maybe: 0, no: 0 };
  for (const a of answers) c[a.answer] += 1;
  return c;
}

// 参加者登録の初期チェック: ○ と △ は参加扱い
export const countsAsAttending = (a: Answer | null | undefined) => a === "yes" || a === "maybe";
