"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import { updateLocaleAction, type LocaleActionState } from "@/app/actions/locale";
import type { Locale } from "@/i18n/config";

const initialState: LocaleActionState = {};

function LanguageControl({ currentLocale }: { currentLocale: Locale }) {
  const t = useTranslations("settings.language");
  const { pending } = useFormStatus();
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-200">
      {t("label")}
      <select
        name="locale"
        defaultValue={currentLocale}
        disabled={pending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-12 rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-base text-white outline-none focus:border-phoenix-orange focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60"
      >
        <option value="en">{t("english")}</option>
        <option value="fr">{t("french")}</option>
        <option value="es">{t("spanish")}</option>
      </select>
      {pending && <span className="text-sm text-slate-400">{t("saving")}</span>}
    </label>
  );
}

export function LanguageSelector({ currentLocale }: { currentLocale: Locale }) {
  const t = useTranslations("settings.language");
  const [state, action] = useActionState(updateLocaleAction, initialState);

  useEffect(() => {
    if (state.locale && state.locale !== currentLocale) window.location.reload();
  }, [currentLocale, state.locale]);

  return (
    <section
      aria-labelledby="language-settings-title"
      className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6"
    >
      <h2 id="language-settings-title" className="text-xl font-semibold text-white">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{t("description")}</p>
      <form action={action} className="mt-5 max-w-sm">
        <LanguageControl currentLocale={currentLocale} />
      </form>
      {state.locale === currentLocale && (
        <p role="status" className="mt-3 text-sm text-emerald-300">
          {t("saved")}
        </p>
      )}
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {t(state.error)}
        </p>
      )}
    </section>
  );
}
