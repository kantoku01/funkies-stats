const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// "2026-09-20" → "9/20(日)"
export function formatGameDate(date: string, withWeekday = true): string {
  const [y, m, d] = date.split("-").map(Number);
  const md = `${m}/${d}`;
  if (!withWeekday) return md;
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${md}(${weekday})`;
}

export const RESULT_LABEL = { win: "勝", lose: "負", draw: "分" } as const;
