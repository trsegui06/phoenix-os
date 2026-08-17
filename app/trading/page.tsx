import { PhoenixMark } from "@/components/ui/phoenix-mark";
import { TradingDashboard } from "@/components/trading/dashboard/trading-dashboard";
import { TradingFilters } from "@/components/trading/dashboard/trading-filters";
import {
  TradingStatisticsValidationError,
  type TradingOverview,
  type TradingStatisticsFilter,
  validateTradingStatisticsFilter,
} from "@/domain/trading/trading-statistics";
import { getSupabaseServerClient } from "@/lib/supabase/server";
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

type Search = Promise<{ from?: string; to?: string; account?: string }>;

export default async function TradingPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  let filter: TradingStatisticsFilter = {};
  let notice: string | null = null;
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

  const client = await getSupabaseServerClient();
  let accounts: Awaited<ReturnType<typeof listTradingAccounts>> = [];
  let overview = emptyOverview;
  let setups: Awaited<ReturnType<typeof getTradingSetupBreakdown>> = [];
  let sessions: Awaited<ReturnType<typeof getTradingSessionTypeBreakdown>> = [];
  let assets: Awaited<ReturnType<typeof getTradingAssetBreakdown>> = [];
  let errors: Awaited<ReturnType<typeof getTradingErrorBreakdown>> = {
    byCategory: [],
    bySeverity: [],
  };

  if (client) {
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
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex items-start gap-4 border-b border-slate-800 pb-8">
        <PhoenixMark />
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-phoenix-orange uppercase">
            Trading cockpit
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Trading Dashboard
          </h1>
          <p className="mt-2 text-base text-slate-300">Process before performance.</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Track execution, risk, consistency and learning from your real trading data.
          </p>
        </div>
      </header>

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
