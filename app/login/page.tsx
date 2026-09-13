import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/components/auth/login-form";
import { BrandLockup } from "@/components/ui/phoenix-mark";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasCurrentTrader } from "@/services/trading/trader-provisioning";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; auth?: string }>;
}) {
  const t = await getTranslations("auth");
  const client = await getSupabaseServerClient();
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (user) redirect((await hasCurrentTrader(client)) ? "/trading" : "/onboarding");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/85 p-6 shadow-sm shadow-black/20 sm:p-8"
      >
        <BrandLockup />
        <h1 id="login-title" className="mt-2 text-3xl font-semibold tracking-tight text-white">
          {t("login.title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{t("login.description")}</p>
        {(await searchParams).reset === "success" && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200"
          >
            {t("messages.passwordUpdated")}
          </p>
        )}
        {(await searchParams).auth === "invalid" && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
          >
            {t("messages.invalidAuthLink")}
          </p>
        )}
        <LoginForm />
        <nav aria-label={t("accountAccess")} className="mt-6 flex justify-between gap-4 text-sm">
          <Link href="/register" className="text-phoenix-orange hover:text-orange-300">
            {t("links.createAccount")}
          </Link>
          <Link href="/forgot-password" className="text-slate-400 hover:text-white">
            {t("links.forgotPassword")}
          </Link>
        </nav>
      </section>
    </main>
  );
}
