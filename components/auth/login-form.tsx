"use client";

import { useActionState } from "react";

import { login, type LoginActionState } from "@/app/actions/auth";

const initialState: LoginActionState = {};
const control =
  "h-12 rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-base text-white outline-none placeholder:text-slate-600 focus:border-phoenix-orange focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action} className="mt-8 grid gap-5" noValidate>
      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Email
        <input
          className={control}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          disabled={pending}
        />
        {state.fieldErrors?.email && (
          <span id="email-error" className="text-sm text-rose-300">
            {state.fieldErrors.email}
          </span>
        )}
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Password
        <input
          className={control}
          type="password"
          name="password"
          autoComplete="current-password"
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          disabled={pending}
        />
        {state.fieldErrors?.password && (
          <span id="password-error" className="text-sm text-rose-300">
            {state.fieldErrors.password}
          </span>
        )}
      </label>

      {state.message && (
        <p
          role="alert"
          className="rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex h-12 items-center justify-center rounded-xl bg-phoenix-orange px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
