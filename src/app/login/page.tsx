import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "編集者ログイン" };

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-sm space-y-6">
      <h1 className="text-xl font-bold">編集者ログイン</h1>
      <p className="text-sm text-slate-600">成績の閲覧にログインは不要です。試合や打席結果を入力する編集者だけがログインします。</p>
      {/* 遷移先 (?next=) はリクエストごとに変わるので Suspense の中で読む */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </section>
  );
}
