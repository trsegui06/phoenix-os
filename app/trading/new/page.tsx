import Link from "next/link";
import { redirect } from "next/navigation";
import { TradeEntryForm } from "@/components/trading/entry/trade-entry-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentTraderId } from "@/services/trading/current-trader";
import { listTradingAccounts } from "@/services/trading/trading-accounts";
import { listTradingSessions } from "@/services/trading/trading-sessions";
import { listTradingSetups } from "@/services/trading/trading-setups";
import { TradingApplicationError } from "@/services/trading/errors";

export default async function NewTradePage() {
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
  const [accounts, sessions, setups] = await Promise.all([
    listTradingAccounts(client),
    listTradingSessions(client),
    listTradingSetups(client),
  ]);
  const missing = [
    !accounts.length && "a Trading Account",
    !sessions.length && "a Session",
    !setups.length && "a Setup",
  ].filter(Boolean);
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/trading" className="text-sm text-slate-400 hover:text-white">
        ← Trading Dashboard
      </Link>
      <h1 className="mt-5 text-3xl font-semibold text-white">New Trade</h1>
      <p className="mt-2 text-slate-400">Record execution and reflection in one atomic entry.</p>
      {missing.length ? (
        <div
          role="status"
          className="mt-8 rounded-xl border border-amber-900 bg-amber-950/30 p-4 text-amber-200"
        >
          <p>Create {missing.join(", ")} before recording a Trade.</p>
          <Link
            href="/trading/settings"
            className="mt-3 inline-block font-semibold text-phoenix-orange underline underline-offset-4"
          >
            Manage Trading Setup
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <TradeEntryForm
            accounts={accounts.map((a) => ({
              id: a.id,
              label: `${a.accountName} — ${a.broker} — ${a.currency}`,
              currency: a.currency,
            }))}
            sessions={sessions.map((s) => ({
              id: s.id,
              label: `${s.sessionDate} — ${s.sessionType}`,
            }))}
            setups={setups.map((s) => ({ id: s.id, label: `${s.name} — ${s.timeframe}` }))}
          />
        </div>
      )}
    </main>
  );
}
