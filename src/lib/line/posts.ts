import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// LINE のグループと送った記録

export type LinePostKind = "day_before" | "schedule";

// 送り先のグループ(公式アカウントを招待すると Webhook で記録される)
export async function getGroupId(): Promise<string | null> {
  const { data } = await createAdminClient().from("line_settings").select("group_id").maybeSingle();
  return data?.group_id ?? null;
}

export async function saveGroupId(groupId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("line_settings")
    .upsert({ id: true, group_id: groupId, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function wasPosted(kind: LinePostKind, ref: string): Promise<boolean> {
  const { data } = await createAdminClient().from("line_posts").select("id").eq("kind", kind).eq("ref", ref).maybeSingle();
  return Boolean(data);
}

// 送った記録。手で送り直したときは日時を新しくする
export async function recordPost(kind: LinePostKind, ref: string, auto: boolean): Promise<void> {
  await createAdminClient()
    .from("line_posts")
    .upsert({ kind, ref, auto, sent_at: new Date().toISOString() }, { onConflict: "kind,ref" });
}

// 編集者の画面用: グループがつながっているか、この試合の連絡を送ったか
export async function getGameLineStatus(gameId: string): Promise<{ groupReady: boolean; sentAt: string | null; auto: boolean }> {
  const supabase = await createClient();
  const [{ data: settings }, { data: post }] = await Promise.all([
    supabase.from("line_settings").select("group_id").maybeSingle(),
    supabase.from("line_posts").select("sent_at, auto").eq("kind", "day_before").eq("ref", gameId).maybeSingle(),
  ]);
  return { groupReady: Boolean(settings), sentAt: post?.sent_at ?? null, auto: post?.auto ?? false };
}
