import "server-only";

// Vercel の定期実行(Cron)からの呼び出しか確かめる。Vercel は CRON_SECRET を Authorization に付けて呼ぶ
export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}
