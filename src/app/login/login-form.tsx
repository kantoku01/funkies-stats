"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/admin";
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1">
        <span className="text-sm font-medium">メールアドレス</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className="block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">パスワード</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-md bg-brand-600 font-bold text-white disabled:opacity-60"
      >
        {pending ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}
