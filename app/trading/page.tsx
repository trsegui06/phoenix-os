import { PhoenixMark } from "@/components/ui/phoenix-mark";
import { logout } from "@/app/actions/auth";
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
import Link from "next/link";
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
  let workspaceConfigured = true;
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
      workspaceConfigured = false;
      notice = "Your account is signed in, but your trading workspace is not configured yet.";
    } else {
      notice = "Trading data is unavailable right now. Please try again shortly.";
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-col items-start justify-between gap-4 border-b border-slate-800 pb-8 sm:flex-row">
        <div className="flex items-start gap-4">
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
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {workspaceConfigured && (
            <Link
              href="/trading/settings"
              className="rounded-lg border border-slate-700 px-3 py-2 text-center text-sm font-medium text-slate-200 hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange"
            >
              Trading Setup
            </Link>
          )}
          {workspaceConfigured && (
            <Link
              href="/trading/new"
              className="rounded-lg bg-phoenix-orange px-3 py-2 text-center text-sm font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange"
            >
              New Trade
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange"
            >
              Logout
            </button>
          </form>
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
