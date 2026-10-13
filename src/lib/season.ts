// 日本時間の今年(シーズン = 暦年)
export function currentYearInJapan(now: Date): number {
  return Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", year: "numeric" }).format(now));
}

// 日本時間の今日(YYYY-MM-DD)
export function todayInJapan(now: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(now);
}
