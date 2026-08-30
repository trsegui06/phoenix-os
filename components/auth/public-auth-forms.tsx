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
  const passwordId = prefix ? "new-password" : "password";
  const confirmPasswordId = prefix ? "confirm-new-password" : "confirm-password";

  return (
    <>
      <div>
        <label htmlFor={passwordId} className="text-sm font-medium text-slate-200">
          {prefix}Password
        </label>
        <input
          id={passwordId}
          className={control}
          type="password"
          name="password"
          autoComplete="new-password"
          disabled={pending}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
        />
        {state.fieldErrors?.password && (
          <span id="password-error" className="mt-2 block text-sm text-rose-300">
            {state.fieldErrors.password}
          </span>
        )}
      </div>
      <div>
        <label htmlFor={confirmPasswordId} className="text-sm font-medium text-slate-200">
          Confirm {prefix.toLowerCase()}password
        </label>
        <input
          id={confirmPasswordId}
          className={control}
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          disabled={pending}
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
          aria-describedby={
            state.fieldErrors?.confirmPassword ? "confirm-password-error" : undefined
          }
        />
        {state.fieldErrors?.confirmPassword && (
          <span id="confirm-password-error" className="mt-2 block text-sm text-rose-300">
            {state.fieldErrors.confirmPassword}
          </span>
        )}
      </div>
    </>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initial);
  return (
    <form action={action} noValidate className="mt-8 grid gap-5">
      <div>
        <label htmlFor="register-email" className="text-sm font-medium text-slate-200">
          Email
        </label>
        <input
          id="register-email"
          className={control}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          disabled={pending}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "register-email-error" : undefined}
        />
        {state.fieldErrors?.email && (
          <span id="register-email-error" className="mt-2 block text-sm text-rose-300">
            {state.fieldErrors.email}
          </span>
        )}
      </div>
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
      <div>
        <label htmlFor="reset-email" className="text-sm font-medium text-slate-200">
          Email
        </label>
        <input
          id="reset-email"
          className={control}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          disabled={pending}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "reset-email-error" : undefined}
        />
        {state.fieldErrors?.email && (
          <span id="reset-email-error" className="mt-2 block text-sm text-rose-300">
            {state.fieldErrors.email}
          </span>
        )}
      </div>
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
