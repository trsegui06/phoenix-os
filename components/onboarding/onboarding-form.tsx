"use client";

import { useActionState } from "react";
import { provisionTraderAction, type OnboardingState } from "@/app/actions/onboarding";

const initial: OnboardingState = {};
const control =
  "mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-white outline-none focus:border-phoenix-orange focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(provisionTraderAction, initial);
  return (
    <form action={action} noValidate className="mt-8 grid gap-5">
      <label className="text-sm font-medium text-slate-200">
        Name
        <input
          name="name"
          autoComplete="name"
          disabled={pending}
          aria-invalid={Boolean(state.fieldErrors?.name)}
          aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
          className={control}
        />
        {state.fieldErrors?.name && (
          <span id="name-error" className="mt-2 block text-sm text-rose-300">
            {state.fieldErrors.name}
          </span>
        )}
      </label>
      <label className="text-sm font-medium text-slate-200">
        Timezone
        <input
          name="timezone"
          defaultValue="Europe/Paris"
          placeholder="Europe/Paris"
          disabled={pending}
          aria-invalid={Boolean(state.fieldErrors?.timezone)}
          aria-describedby={state.fieldErrors?.timezone ? "timezone-error" : "timezone-help"}
          className={control}
        />
        <span id="timezone-help" className="mt-2 block text-xs text-slate-500">
          Use an IANA timezone so trading dates remain meaningful.
        </span>
        {state.fieldErrors?.timezone && (
          <span id="timezone-error" className="mt-2 block text-sm text-rose-300">
            {state.fieldErrors.timezone}
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
        disabled={pending}
        className="h-12 rounded-xl bg-phoenix-orange px-5 text-sm font-semibold text-slate-950 hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Building workspace…" : "Build my trading workspace"}
      </button>
    </form>
  );
}
