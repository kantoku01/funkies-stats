import type { Metadata } from "next";
import { getCurrentEditor } from "@/lib/auth";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { AddEditorForm, ChangePasswordForm, EditorRow } from "./editor-forms";

export const metadata: Metadata = { title: "編集者の管理" };

export default async function EditorsPage() {
  const me = await getCurrentEditor();
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-bold">編集者の管理</h1>
      {adminConfigured() ? (
        <EditorList myUserId={me?.userId ?? null} />
      ) : (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          編集者の追加には、Vercel の環境変数 SUPABASE_SECRET_KEY(Supabase の Project Settings &gt; API Keys の Secret key)の登録が必要です。
          登録して Redeploy すると、ここから追加できるようになります。
        </p>
      )}
      <div className="space-y-2">
        <h2 className="font-bold">自分のパスワードを変える</h2>
        <ChangePasswordForm />
      </div>
    </section>
  );
}

async function EditorList({ myUserId }: { myUserId: string | null }) {
  const admin = createAdminClient();
  const [{ data: editors }, { data: users }] = await Promise.all([
    admin.from("editors").select("user_id, display_name").order("display_name"),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ]);
  const userOf = new Map((users?.users ?? []).map((u) => [u.id, u]));

  return (
    <>
      <div className="space-y-2">
        <h2 className="font-bold">編集者({editors?.length ?? 0}人)</h2>
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {(editors ?? []).map((e) => {
            const u = userOf.get(e.user_id);
            return (
              <EditorRow
                key={e.user_id}
                userId={e.user_id}
                displayName={e.display_name}
                email={u?.email ?? "(メールアドレス不明)"}
                lastSignIn={u?.last_sign_in_at ?? null}
                isMe={e.user_id === myUserId}
              />
            );
          })}
        </ul>
      </div>
      <div className="space-y-2">
        <h2 className="font-bold">編集者を追加する</h2>
        <AddEditorForm />
      </div>
    </>
  );
}
