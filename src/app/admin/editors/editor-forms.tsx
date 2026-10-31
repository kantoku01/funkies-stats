"use client";

import { useActionState, useState } from "react";
import { addEditor, changeOwnPassword, removeEditor, resetEditorPassword, type EditorActionState } from "./actions";

const input = "block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base";
const initial: EditorActionState = { message: null };

// 追加・再発行したときに、本人へ送る文面(仮のパスワード付き)。この画面を離れると二度と出ない
function PasswordNotice({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false);
  const loginUrl = typeof window === "undefined" ? "/login" : `${window.location.origin}/login`;
  const text = [
    "ファンキーズアプリの編集者に登録しました。",
    `ログイン: ${loginUrl}`,
    `メールアドレス: ${email}`,
    `仮のパスワード: ${password}`,
    "ログインしたら「編集 > 編集者の管理」でパスワードを変えてください。",
  ].join("\n");
  return (
    <div className="space-y-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">
      <p className="font-bold text-emerald-800">仮のパスワードを作りました。この画面を離れると二度と表示されないので、本人に送ってください。</p>
      <pre className="whitespace-pre-wrap break-all rounded bg-white p-2 font-sans">{text}</pre>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://line.me/R/msg/text/?${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center rounded-md bg-[#06C755] font-bold text-white"
        >
          LINEで送る
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch {
              window.prompt("この文面をコピーしてください", text);
            }
          }}
          className="min-h-11 rounded-md border border-slate-300 bg-white"
        >
          {copied ? "コピーしました" : "文面をコピー"}
        </button>
      </div>
    </div>
  );
}

export function AddEditorForm() {
  const [state, action, pending] = useActionState(addEditor, initial);
  return (
    <div className="space-y-3">
      <form action={action} className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
        <input name="email" type="email" required autoComplete="off" placeholder="メールアドレス" className={input} />
        <input name="displayName" required maxLength={20} autoComplete="off" placeholder="名前(画面に出る名前。例: 安達)" className={input} />
        <button type="submit" disabled={pending} className="min-h-11 w-full rounded-md bg-brand-600 font-bold text-white disabled:opacity-60">
          {pending ? "追加中…" : "編集者を追加"}
        </button>
        {state.message && <p className="text-sm text-red-700">{state.message}</p>}
        <p className="text-xs text-slate-500">すでにログイン用のアカウントがある人は、仮のパスワードを出し直して編集者にします。</p>
      </form>
      {state.ok && state.email && state.password && <PasswordNotice email={state.email} password={state.password} />}
    </div>
  );
}

export function EditorRow({
  userId,
  displayName,
  email,
  lastSignIn,
  isMe,
}: {
  userId: string;
  displayName: string;
  email: string;
  lastSignIn: string | null;
  isMe: boolean;
}) {
  const [resetState, resetAction, resetting] = useActionState(resetEditorPassword, initial);
  const [removeState, removeAction, removing] = useActionState(removeEditor, initial);
  const last = lastSignIn
    ? new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" }).format(new Date(lastSignIn))
    : "まだログインしていません";
  return (
    <li className="space-y-2 p-3">
      <div>
        <p className="font-bold">
          {displayName}
          {isMe && <span className="ml-2 text-xs font-normal text-slate-500">(自分)</span>}
        </p>
        <p className="break-all text-sm text-slate-600">{email}</p>
        <p className="text-xs text-slate-500">最後のログイン: {last}</p>
      </div>
      {!isMe && (
        <div className="grid grid-cols-2 gap-2">
          <form
            action={resetAction}
            onSubmit={(e) => {
              if (!window.confirm(`${displayName} さんの仮のパスワードを出し直します。今のパスワードは使えなくなります。よろしいですか?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="email" value={email} />
            <button type="submit" disabled={resetting} className="min-h-10 w-full rounded-md border border-slate-300 bg-white text-sm">
              パスワード再発行
            </button>
          </form>
          <form
            action={removeAction}
            onSubmit={(e) => {
              if (!window.confirm(`${displayName} さんを編集者から外します。ログインもできなくなります。よろしいですか?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="userId" value={userId} />
            <button type="submit" disabled={removing} className="min-h-10 w-full rounded-md border border-red-300 bg-white text-sm text-red-700">
              編集者から外す
            </button>
          </form>
        </div>
      )}
      {resetState.message && <p className="text-sm text-red-700">{resetState.message}</p>}
      {removeState.message && <p className="text-sm text-red-700">{removeState.message}</p>}
      {resetState.ok && resetState.password && <PasswordNotice email={email} password={resetState.password} />}
    </li>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, initial);
  return (
    <form action={action} className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
      <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="新しいパスワード(8文字以上)" className={input} />
      <input name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="もう一度" className={input} />
      <button type="submit" disabled={pending} className="min-h-11 w-full rounded-md border border-brand-600 font-bold text-brand-700 disabled:opacity-60">
        {pending ? "変更中…" : "パスワードを変える"}
      </button>
      {state.message && <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>}
    </form>
  );
}
