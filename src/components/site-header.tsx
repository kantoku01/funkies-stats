import Link from "next/link";
import { Suspense } from "react";
import { isLoggedIn } from "@/lib/auth";

export function SiteHeader() {
  return (
    <header className="bg-blue-900 text-white">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="font-bold">
          ファンキーズ打撃成績
        </Link>
        {/* ログイン状態の確認はリクエスト時に行うので、ヘッダー本体を待たせない */}
        <Suspense fallback={null}>
          <AuthStatus />
        </Suspense>
      </div>
    </header>
  );
}

async function AuthStatus() {
  if (!(await isLoggedIn())) {
    return (
      <Link href="/login" className="text-sm text-blue-100 underline-offset-4 hover:underline">
        編集者ログイン
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/admin" className="text-blue-100 underline-offset-4 hover:underline">
        編集
      </Link>
      <form action="/auth/signout" method="post">
        <button type="submit" className="min-h-11 text-blue-100 underline-offset-4 hover:underline">
          ログアウト
        </button>
      </form>
    </div>
  );
}
