import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { PageHeader } from "@/components/navigation/page-header";
import { LanguageSelector } from "@/components/trading/settings/language-selector";
import { isLocale, defaultLocale } from "@/i18n/config";
import {
  AccountSettings,
  SessionSettings,
  SetupSettings,
} from "@/components/trading/settings/settings-forms";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentTraderId } from "@/services/trading/current-trader";
import { TradingApplicationError } from "@/services/trading/errors";
import { listTradingAccounts } from "@/services/trading/trading-accounts";
import { listTradingSessions } from "@/services/trading/trading-sessions";
import { listTradingSetups } from "@/services/trading/trading-setups";

const successes: Record<string, string> = {
  "account-created": "Trading Account created.",
  "account-updated": "Trading Account updated.",
  "account-deleted": "Trading Account deleted.",
  "session-created": "Session created.",
  "session-updated": "Session updated.",
  "setup-created": "Setup created.",
  "setup-updated": "Setup updated.",
};
const errors: Record<string, string> = {
  validation: "Check the form values and try again.",
  conflict: "That record already exists.",
  "not-found": "That record is unavailable.",
  profile: "Your trading workspace is not configured yet.",
  persistence: "The change could not be saved. Try again.",
  "account-in-use":
    "This account contains trading history and cannot be deleted. Set it inactive instead.",
};

export default async function TradingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const client = await getSupabaseServerClient();
  if (!client) redirect("/login");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  try {
    await resolveCurrentTraderId(client);
  } catch (error) {
    if (error instanceof TradingApplicationError && error.code === "TRADER_PROFILE_NOT_FOUND")
      redirect("/onboarding");
    throw error;
  }
  const [accounts, sessions, setups, locale] = await Promise.all([
    listTradingAccounts(client),
    listTradingSessions(client),
    listTradingSetups(client),
    getLocale(),
  ]);
  const ready = accounts.length > 0 && sessions.length > 0 && setups.length > 0;
  const search = await searchParams;
  const notice = search.success
    ? successes[search.success]
    : search.error
      ? errors[search.error]
      : null;
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
      <PageHeader
        eyebrow="Self-service prerequisites"
        title="Trading Setup"
        description="Configure the structures required before recording Trades."
        action={
          ready ? (
            <Link
              href="/trading/new"
              className="inline-flex min-h-11 items-center rounded-lg bg-phoenix-orange px-4 py-2 font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange"
            >
              Record a Trade
            </Link>
          ) : undefined
        }
      />
      {notice && (
        <p
          role={search.error ? "alert" : "status"}
          className={`mt-6 rounded-xl border px-4 py-3 text-sm ${search.error ? "border-red-900 bg-red-950/30 text-red-200" : "border-emerald-900 bg-emerald-950/30 text-emerald-200"}`}
        >
          {notice}
        </p>
      )}
      <section aria-label="Trading setup readiness" className="mt-8 grid gap-3 sm:grid-cols-4">
        {[
          ["Accounts", accounts.length],
          ["Sessions", sessions.length],
          ["Setups", setups.length],
        ].map(([name, count]) => (
          <div key={name} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">{name}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{count}</p>
          </div>
        ))}
        <div
          className={`rounded-xl border p-4 ${ready ? "border-emerald-900 bg-emerald-950/30" : "border-amber-900 bg-amber-950/30"}`}
        >
          <p className="text-sm text-slate-400">Ready for Trade Entry</p>
          <p className={`mt-1 font-semibold ${ready ? "text-emerald-200" : "text-amber-200"}`}>
            {ready ? "Yes" : "Complete prerequisites"}
          </p>
        </div>
      </section>
      <div className="mt-8 grid gap-6">
        <LanguageSelector currentLocale={isLocale(locale) ? locale : defaultLocale} />
        <AccountSettings accounts={accounts} />
        <SessionSettings sessions={sessions} />
        <SetupSettings setups={setups} />
      </div>
    </main>
  );
}
