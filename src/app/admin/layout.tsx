import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getCurrentEditor, isLoggedIn } from "@/lib/auth";

export const metadata: Metadata = { title: "編集" };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
      <EditorGate>{children}</EditorGate>
    </Suspense>
  );
}

// 編集者だけが中を見られる。実際の書き込み可否は DB の RLS でも制限している
async function EditorGate({ children }: { children: ReactNode }) {
  const editor = await getCurrentEditor();

  if (!editor) {
    if (!(await isLoggedIn())) redirect("/login?next=/admin");

    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">権限がありません</h1>
        <p className="text-slate-600">このアカウントは編集者として登録されていません。管理者に連絡してください。</p>
        <Link href="/" className="text-brand-700 underline">
          ホームへ戻る
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{editor.displayName} さんとしてログイン中</p>
      {children}
    </div>
  );
}
