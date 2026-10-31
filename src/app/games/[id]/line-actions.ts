"use server";

import { getCurrentEditor } from "@/lib/auth";
import { lineConfigured, pushToGroup } from "@/lib/line/api";
import { getGroupId, recordPost } from "@/lib/line/posts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SendResult = { ok: true; sentAt: string } | { ok: false; error: string };

// 試合前日の連絡を、編集者が直した文面のままチームのグループに送る。送ったら前日18時の自動送信はしない
export async function sendGameMessage(gameId: string, text: string): Promise<SendResult> {
  if (!(await getCurrentEditor())) return { ok: false, error: "編集者としてログインしてください。" };
  if (!UUID.test(gameId) || !text.trim() || text.length > 5000) return { ok: false, error: "文面が正しくありません(5000文字まで)。" };
  if (!lineConfigured()) return { ok: false, error: "LINE の設定(Vercel の環境変数)がまだです。" };
  const groupId = await getGroupId();
  if (!groupId) return { ok: false, error: "送り先のグループがまだ登録されていません。公式アカウントをグループに招待してください。" };

  const sent = await pushToGroup(groupId, text);
  if (!sent.ok) return sent;
  await recordPost("day_before", gameId, false);
  return { ok: true, sentAt: new Date().toISOString() };
}
