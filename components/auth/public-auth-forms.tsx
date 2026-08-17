"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  register,
  requestPasswordReset,
  updateRecoveredPassword,
  type PublicAuthState,
} from "@/app/actions/public-auth";

const initial: PublicAuthState = {};
const control =
  "mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-white outline-none focus:border-phoenix-orange focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60";

function Status({ state }: { state: PublicAuthState }) {
  return state.message ? (
    <p
      role={state.success ? "status" : "alert"}
      className={`rounded-xl border px-4 py-3 text-sm ${state.success ? "border-emerald-900 bg-emerald-950/30 text-emerald-200" : "border-rose-900/60 bg-rose-950/30 text-rose-200"}`}
    >
      {state.message}
    </p>
  ) : null;
}

function PasswordFields({
  state,
  pending,
  prefix = "",
}: {
  state: PublicAuthState;
  pending: boolean;
  prefix?: string;
}) {
  return (
    <>
      <label className="text-sm font-medium text-slate-200">
        {prefix}Password
        <input
          className={control}
          type="password"
          name="password"
          autoComplete="new-password"
          disabled={pending}
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        {state.fieldErrors?.password && (
          <span className="mt-2 block text-sm text-rose-300">{state.fieldErrors.password}</span>
        )}
      </label>
      <label className="text-sm font-medium text-slate-200">
        Confirm {prefix.toLowerCase()}password
        <input
          className={control}
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          disabled={pending}
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
        />
        {state.fieldErrors?.confirmPassword && (
          <span className="mt-2 block text-sm text-rose-300">
            {state.fieldErrors.confirmPassword}
          </span>
        )}
      </label>
    </>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initial);
  return (
    <form action={action} noValidate className="mt-8 grid gap-5">
      <label className="text-sm font-medium text-slate-200">
        Email
        <input
          className={control}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          disabled={pending}
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email && (
          <span className="mt-2 block text-sm text-rose-300">{state.fieldErrors.email}</span>
        )}
      </label>
      <PasswordFields state={state} pending={pending} />
      <Status state={state} />
      <button
        disabled={pending}
        className="h-12 rounded-xl bg-phoenix-orange font-semibold text-slate-950 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
      <Link href="/login" className="text-center text-sm text-slate-400 hover:text-white">
        Already have an account? Sign in
      </Link>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  return (
    <form action={action} noValidate className="mt-8 grid gap-5">
      <label className="text-sm font-medium text-slate-200">
        Email
        <input
          className={control}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          disabled={pending}
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email && (
          <span className="mt-2 block text-sm text-rose-300">{state.fieldErrors.email}</span>
        )}
      </label>
      <Status state={state} />
      <button
        disabled={pending}
        className="h-12 rounded-xl bg-phoenix-orange font-semibold text-slate-950 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Sending instructions…" : "Send reset instructions"}
      </button>
      <Link href="/login" className="text-center text-sm text-slate-400 hover:text-white">
        Back to sign in
      </Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updateRecoveredPassword, initial);
  return (
    <form action={action} noValidate className="mt-8 grid gap-5">
      <PasswordFields state={state} pending={pending} prefix="New " />
      <Status state={state} />
      <button
        disabled={pending}
        className="h-12 rounded-xl bg-phoenix-orange font-semibold text-slate-950 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Updating password…" : "Update password"}
      </button>
    </form>
  );
}
