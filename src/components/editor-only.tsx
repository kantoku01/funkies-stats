import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getCurrentEditor } from "@/lib/auth";

// ログイン中の編集者にだけ中身を出す。ログイン状態はリクエスト時に確認するので、周りの表示は待たせない
export function EditorOnly({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <EditorGate>{children}</EditorGate>
    </Suspense>
  );
}

async function EditorGate({ children }: { children: ReactNode }) {
  return (await getCurrentEditor()) ? <>{children}</> : null;
}

// 編集者向けの「〜を追加」ボタン
export function AddButton({ href, label }: { href: string; label: string }) {
  return (
    <EditorOnly>
      <Link href={href} className="flex min-h-11 items-center rounded-md bg-brand-600 px-4 text-sm font-bold text-white">
        {label}
      </Link>
    </EditorOnly>
  );
}
