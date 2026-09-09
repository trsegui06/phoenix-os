import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { BrandLockup } from "@/components/ui/phoenix-mark";
import { resolveOnboardingStep } from "@/lib/onboarding";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasCurrentTrader } from "@/services/trading/trader-provisioning";
import { listTradingAccounts } from "@/services/trading/trading-accounts";
import { listTradingSessions } from "@/services/trading/trading-sessions";
import { listTradingSetups } from "@/services/trading/trading-setups";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const t = await getTranslations("onboarding");
  const client = await getSupabaseServerClient();
  if (!client) redirect("/login");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");

  const hasTrader = await hasCurrentTrader(client);
  const [accounts, sessions, setups] = hasTrader
    ? await Promise.all([
        listTradingAccounts(client),
        listTradingSessions(client),
        listTradingSetups(client),
      ])
    : [[], [], []];
  const step = resolveOnboardingStep(
    {
      hasTrader,
      accountCount: accounts.length,
      sessionCount: sessions.length,
      setupCount: setups.length,
    },
    (await searchParams).step,
  );
  const copy = {
    eyebrow: t(`${step}.eyebrow`),
    title: t(`${step}.title`),
    description: t(`${step}.description`),
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section
        aria-labelledby="onboarding-title"
        className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/85 p-6 shadow-sm shadow-black/20 sm:p-8"
      >
        <BrandLockup />
        <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-phoenix-orange uppercase">
          {copy.eyebrow}
        </p>
        <h1
          id="onboarding-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          {copy.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{copy.description}</p>
        {step === "welcome" && (
          <ol aria-label={t("principles.label")} className="mt-7 grid gap-3 sm:grid-cols-3">
            {(["execute", "review", "improve"] as const).map((principle, index) => (
              <li
                key={principle}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
              >
                <span className="text-xs text-slate-500">0{index + 1}</span>
                <p className="mt-2 font-semibold text-white">{t(`principles.${principle}`)}</p>
              </li>
            ))}
          </ol>
        )}
        <OnboardingForm step={step} needsSession={!sessions.length} needsSetup={!setups.length} />
      </section>
    </main>
  );
}
