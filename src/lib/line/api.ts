import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

// LINE Messaging API。Vercel の環境変数 LINE_CHANNEL_ACCESS_TOKEN / LINE_CHANNEL_SECRET が必要
// (LINE_API_BASE は手元で送信を確かめるときだけ、偽のサーバーに向けるのに使う)
const LINE_API = process.env.LINE_API_BASE ?? "https://api.line.me";

export const lineConfigured = () => Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET);

// Webhook が LINE から来たものか確かめる(本文の HMAC-SHA256 と x-line-signature を比べる)
export function verifyLineSignature(body: string, signature: string | null, secret = process.env.LINE_CHANNEL_SECRET ?? ""): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("base64"));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// グループに文面を送る。1通は5000文字まで
export async function pushToGroup(groupId: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`${LINE_API}/v2/bot/message/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      "X-Line-Retry-Key": randomUUID(),
    },
    body: JSON.stringify({ to: groupId, messages: [{ type: "text", text: text.slice(0, 5000) }] }),
    cache: "no-store",
  });
  if (res.ok) return { ok: true };
  const detail = await res.text().catch(() => "");
  return { ok: false, error: `LINE への送信に失敗しました(${res.status}) ${detail.slice(0, 200)}` };
}
