import { PageHeader } from "@/components/navigation/page-header";
import { TradingDashboard } from "@/components/trading/dashboard/trading-dashboard";
import { TradingFilters } from "@/components/trading/dashboard/trading-filters";
import {
  TradingStatisticsValidationError,
  type TradingOverview,
  type TradingStatisticsFilter,
  validateTradingStatisticsFilter,
} from "@/domain/trading/trading-statistics";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveCurrentTraderId } from "@/services/trading/current-trader";
import { TradingApplicationError } from "@/services/trading/errors";
import { listTradingAccounts } from "@/services/trading/trading-accounts";
import {
  getTradingAssetBreakdown,
  getTradingErrorBreakdown,
  getTradingOverview,
  getTradingSessionTypeBreakdown,
  getTradingSetupBreakdown,
} from "@/services/trading/trading-statistics";

const emptyOverview: TradingOverview = {
  totalTradeCount: 0,
  closedTradeCount: 0,
  unresolvedTradeCount: 0,
  winCount: 0,
  lossCount: 0,
  breakevenCount: 0,
  winRate: null,
  averageRiskBasisPoints: null,
  realizedPnlByCurrency: [],
  tradeErrorCount: 0,
  tradesWithErrorsCount: 0,
  tradeErrorRate: null,
  reviewCount: 0,
  objectiveCount: 0,
};

type Search = Promise<{ from?: string; to?: string; account?: string; created?: string }>;

export default async function TradingPage({ searchParams }: { searchParams: Search }) {
  const client = await getSupabaseServerClient();
  if (!client) redirect("/login");

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");

  const search = await searchParams;
  let filter: TradingStatisticsFilter = {};
  let notice: string | null = null;
  const workspaceConfigured = true;
  const created = search.created === "trade";
  try {
    filter = validateTradingStatisticsFilter({
      ...(search.from ? { from: search.from } : {}),
      ...(search.to ? { to: search.to } : {}),
      ...(search.account ? { tradingAccountId: search.account } : {}),
    });
  } catch (error) {
    if (error instanceof TradingStatisticsValidationError)
      notice = "Those filters were invalid, so the dashboard was reset.";
  }

  let accounts: Awaited<ReturnType<typeof listTradingAccounts>> = [];
  let overview = emptyOverview;
  let setups: Awaited<ReturnType<typeof getTradingSetupBreakdown>> = [];
  let sessions: Awaited<ReturnType<typeof getTradingSessionTypeBreakdown>> = [];
  let assets: Awaited<ReturnType<typeof getTradingAssetBreakdown>> = [];
  let errors: Awaited<ReturnType<typeof getTradingErrorBreakdown>> = {
    byCategory: [],
    bySeverity: [],
  };

  try {
    await resolveCurrentTraderId(client);
    try {
      [accounts, overview, setups, sessions, assets, errors] = await Promise.all([
        listTradingAccounts(client),
        getTradingOverview(client, filter),
        getTradingSetupBreakdown(client, filter),
        getTradingSessionTypeBreakdown(client, filter),
        getTradingAssetBreakdown(client, filter),
        getTradingErrorBreakdown(client, filter),
      ]);
    } catch {
      notice = "Trading data is unavailable right now. Please try again shortly.";
    }
  } catch (error) {
    if (error instanceof TradingApplicationError && error.code === "TRADER_PROFILE_NOT_FOUND") {
      redirect("/onboarding");
    } else {
      notice = "Trading data is unavailable right now. Please try again shortly.";
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl overflow-x-hidden px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <PageHeader
        eyebrow="Trading cockpit"
        title="Trading Dashboard"
        description={
          <>
            <span className="block text-slate-300">Process before performance.</span>
            <span className="mt-1 block text-sm text-slate-500">
              Track execution, risk, consistency and learning from your real trading data.
            </span>
          </>
        }
      />

      <div className="mt-8">
        <TradingFilters filter={filter} accounts={accounts} />
      </div>
      {notice && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200"
        >
          {notice}
        </p>
      )}
      {created && workspaceConfigured && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200"
        >
          Trade recorded.
        </p>
      )}
      <div className="mt-6">
        <TradingDashboard
          overview={overview}
          setups={setups}
          sessions={sessions}
          assets={assets}
          errors={errors}
        />
      </div>
    </main>
  );
}
