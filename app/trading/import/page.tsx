import { redirect } from "next/navigation";

import { PageHeader } from "@/components/navigation/page-header";
import { TradeImportWorkflow } from "@/components/trading/import/trade-import-workflow";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentTraderId } from "@/services/trading/current-trader";
import { listTradingAccounts } from "@/services/trading/trading-accounts";
import { listTradingSetups } from "@/services/trading/trading-setups";

export default async function HistoricalTradeImportPage() {
  const client = await getSupabaseServerClient();
  if (!client) redirect("/login");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  await resolveCurrentTraderId(client);
  const [accounts, setups] = await Promise.all([
    listTradingAccounts(client),
    listTradingSetups(client),
  ]);
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
      <PageHeader
        eyebrow="Historical data"
        title="Import Trades"
        description="Analyze, map and confirm broker history before any Trade is created."
      />
      <div className="mt-8">
        <TradeImportWorkflow
          accounts={accounts.map((account) => ({
            id: account.id,
            label: `${account.accountName} — ${account.broker} — ${account.currency}`,
          }))}
          setups={setups.map((setup) => ({
            id: setup.id,
            label: `${setup.name} — ${setup.timeframe}`,
          }))}
        />
      </div>
    </main>
  );
}
