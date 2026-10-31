import { verifyLineSignature } from "@/lib/line/api";
import { getGroupId, saveGroupId } from "@/lib/line/posts";

type LineEvent = { type: string; source?: { type: string; groupId?: string } };

// LINE からの通知(Webhook)。公式アカウントをグループに招待したら、そのグループを送り先として記録する。
// すでにグループに入っている場合は、そのグループで誰かが発言したときに記録する(まだ記録がなければ)
export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyLineSignature(body, request.headers.get("x-line-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }
  const { events = [] } = JSON.parse(body) as { events?: LineEvent[] };
  for (const e of events) {
    const groupId = e.source?.type === "group" ? e.source.groupId : undefined;
    if (!groupId) continue;
    if (e.type === "join" || (e.type === "message" && !(await getGroupId()))) await saveGroupId(groupId);
  }
  return Response.json({ ok: true });
}
