"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  configureTradingEnvironmentAction,
  createFirstAccountAction,
  provisionTraderAction,
  type OnboardingState,
} from "@/app/actions/onboarding";
import type { OnboardingStep } from "@/lib/onboarding";

const initial: OnboardingState = {};
const control =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-phoenix-orange focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60";
const primary =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-phoenix-orange px-5 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange disabled:cursor-wait disabled:opacity-60";
const secondary =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange";

function ErrorMessage({ state, name }: { state: OnboardingState; name: string }) {
  const error = state.fieldErrors?.[name];
  return error ? (
    <span id={`${name}-error`} className="mt-2 block text-sm text-rose-300">
      {error}
    </span>
  ) : null;
}

function Status({ state }: { state: OnboardingState }) {
  return state.message ? (
    <p
      role="alert"
      className="rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
    >
      {state.message}
    </p>
  ) : null;
}

function Field({
  name,
  label,
  state,
  pending,
  ...inputProps
}: {
  name: string;
  label: string;
  state: OnboardingState;
  pending: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const invalid = Boolean(state.fieldErrors?.[name]);
  return (
    <label className="text-sm font-medium text-slate-200">
      {label}
      <input
        {...inputProps}
        name={name}
        disabled={pending}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${name}-error` : undefined}
        className={control}
      />
      <ErrorMessage state={state} name={name} />
    </label>
  );
}

function WelcomeForm() {
  const [state, action, pending] = useActionState(provisionTraderAction, initial);
  return (
    <form action={action} noValidate className="mt-8 grid gap-5">
      <Field
        name="name"
        label="Workspace name"
        autoComplete="name"
        state={state}
        pending={pending}
      />
      <Field
        name="timezone"
        label="Timezone"
        defaultValue="Europe/Paris"
        placeholder="Europe/Paris"
        state={state}
        pending={pending}
      />
      <Status state={state} />
      <button disabled={pending} className={primary}>
        {pending ? "Setting up…" : "Set Up My Trading Environment"}
      </button>
    </form>
  );
}

function AccountForm() {
  const [state, action, pending] = useActionState(createFirstAccountAction, initial);
  return (
    <form action={action} noValidate className="mt-8 grid gap-5 sm:grid-cols-2">
      <Field name="accountName" label="Account Name" required state={state} pending={pending} />
      <Field name="broker" label="Broker" required state={state} pending={pending} />
      <Field name="accountType" label="Account Type" required state={state} pending={pending} />
      <Field
        name="currency"
        label="Currency (3-letter code)"
        required
        state={state}
        pending={pending}
      />
      <Field
        name="initialBalance"
        label="Initial Balance"
        inputMode="decimal"
        required
        state={state}
        pending={pending}
      />
      <Field
        name="status"
        label="Status"
        defaultValue="active"
        required
        state={state}
        pending={pending}
      />
      <div className="sm:col-span-2">
        <Status state={state} />
      </div>
      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
        <Link href="/onboarding?step=environment" className={secondary}>
          Skip for now
        </Link>
        <button disabled={pending} className={primary}>
          {pending ? "Saving…" : "Continue"}
        </button>
      </div>
    </form>
  );
}

function EnvironmentForm({
  needsSession,
  needsSetup,
}: {
  needsSession: boolean;
  needsSetup: boolean;
}) {
  const [state, action, pending] = useActionState(configureTradingEnvironmentAction, initial);
  return (
    <form action={action} noValidate className="mt-8 grid gap-7">
      {needsSession && (
        <fieldset className="grid gap-5 rounded-2xl border border-slate-800 p-5 sm:grid-cols-2">
          <legend className="px-2 text-lg font-semibold text-white">Trading Session</legend>
          <Field
            name="sessionDate"
            label="Session Date"
            type="date"
            required
            state={state}
            pending={pending}
          />
          <Field name="sessionType" label="Session Type" required state={state} pending={pending} />
          <Field name="marketBias" label="Market Bias (optional)" state={state} pending={pending} />
          <Field
            name="emotionalState"
            label="Emotional State (optional)"
            state={state}
            pending={pending}
          />
          <label className="text-sm font-medium text-slate-200 sm:col-span-2">
            Notes (optional)
            <textarea name="notes" disabled={pending} className={control} />
          </label>
        </fieldset>
      )}
      {needsSetup && (
        <fieldset className="grid gap-5 rounded-2xl border border-slate-800 p-5 sm:grid-cols-2">
          <legend className="px-2 text-lg font-semibold text-white">Trading Setup</legend>
          <Field name="name" label="Name" required state={state} pending={pending} />
          <Field name="timeframe" label="Timeframe" required state={state} pending={pending} />
          <Field
            name="marketCondition"
            label="Market Condition (optional)"
            state={state}
            pending={pending}
          />
          {[
            ["entryRules", "Entry Rules"],
            ["exitRules", "Exit Rules"],
            ["validationRules", "Validation Rules"],
          ].map(([name, label]) => (
            <label key={name} className="text-sm font-medium text-slate-200 sm:col-span-2">
              {label}
              <textarea
                name={name}
                required
                disabled={pending}
                aria-invalid={Boolean(state.fieldErrors?.[name])}
                aria-describedby={state.fieldErrors?.[name] ? `${name}-error` : undefined}
                className={control}
              />
              <ErrorMessage state={state} name={name} />
            </label>
          ))}
        </fieldset>
      )}
      <Status state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/onboarding?step=complete" className={secondary}>
          Skip for now
        </Link>
        <button disabled={pending} className={primary}>
          {pending ? "Finishing…" : "Finish Setup"}
        </button>
      </div>
    </form>
  );
}

export function OnboardingForm({
  step,
  needsSession,
  needsSetup,
}: {
  step: OnboardingStep;
  needsSession: boolean;
  needsSetup: boolean;
}) {
  if (step === "welcome") return <WelcomeForm />;
  if (step === "account") return <AccountForm />;
  if (step === "environment")
    return <EnvironmentForm needsSession={needsSession} needsSetup={needsSetup} />;
  return (
    <Link href="/trading" className={`mt-8 w-full ${primary}`}>
      Go to Dashboard
    </Link>
  );
}
