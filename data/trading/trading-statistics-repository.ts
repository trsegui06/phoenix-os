import type { Json } from "@/lib/supabase/database.types";
import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import type {
  TradingAssetBreakdown,
  TradingErrorBreakdown,
  TradingOverview,
  TradingPerformanceBreakdownMetrics,
  TradingSessionTypeBreakdown,
  TradingSetupBreakdown,
  TradingStatisticsFilter,
} from "@/domain/trading/trading-statistics";

type OverviewRow = {
  total_trade_count: string;
  closed_trade_count: string;
  unresolved_trade_count: string;
  win_count: string;
  loss_count: string;
  breakeven_count: string;
  win_rate: string | null;
  average_risk_basis_points: string | null;
  realized_pnl_by_currency: Json;
  trade_error_count: string;
  trades_with_errors_count: string;
  trade_error_rate: string | null;
  review_count: string;
  objective_count: string;
};

const decimal = /^-?\d+(?:\.\d+)?$/;

export function mapStatisticsCount(value: unknown, field: string): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) throw new Error(`${field} is malformed.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${field} is unsafe.`);
  return parsed;
}

function nullableDecimal(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !decimal.test(value)) throw new Error(`${field} is malformed.`);
  return value;
}

function rate(value: unknown, field: string): number | null {
  const exact = nullableDecimal(value, field);
  if (exact === null) return null;
  const parsed = Number(exact);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) throw new Error(`${field} is invalid.`);
  return parsed;
}

function monetaryGroups(value: Json): TradingOverview["realizedPnlByCurrency"] {
  if (!Array.isArray(value)) throw new Error("realizedPnlByCurrency is malformed.");
  return value.map((group) => {
    if (!group || Array.isArray(group) || typeof group !== "object") {
      throw new Error("realizedPnlByCurrency is malformed.");
    }
    const currency = group.currency;
    if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
      throw new Error("currency is malformed.");
    }
    const money = (field: string) => {
      const result = group[field];
      if (typeof result !== "string" || !decimal.test(result)) {
        throw new Error(`${field} is malformed.`);
      }
      return result;
    };
    return {
      currency,
      realizedPnlCents: money("realizedPnlCents"),
      averagePnlCents: money("averagePnlCents"),
      grossProfitCents: money("grossProfitCents"),
      grossLossCents: money("grossLossCents"),
    };
  });
}

export function mapTradingOverviewRow(row: OverviewRow): TradingOverview {
  const overview: TradingOverview = {
    totalTradeCount: mapStatisticsCount(row.total_trade_count, "totalTradeCount"),
    closedTradeCount: mapStatisticsCount(row.closed_trade_count, "closedTradeCount"),
    unresolvedTradeCount: mapStatisticsCount(row.unresolved_trade_count, "unresolvedTradeCount"),
    winCount: mapStatisticsCount(row.win_count, "winCount"),
    lossCount: mapStatisticsCount(row.loss_count, "lossCount"),
    breakevenCount: mapStatisticsCount(row.breakeven_count, "breakevenCount"),
    winRate: rate(row.win_rate, "winRate"),
    averageRiskBasisPoints: nullableDecimal(
      row.average_risk_basis_points,
      "averageRiskBasisPoints",
    ),
    realizedPnlByCurrency: monetaryGroups(row.realized_pnl_by_currency),
    tradeErrorCount: mapStatisticsCount(row.trade_error_count, "tradeErrorCount"),
    tradesWithErrorsCount: mapStatisticsCount(
      row.trades_with_errors_count,
      "tradesWithErrorsCount",
    ),
    tradeErrorRate: rate(row.trade_error_rate, "tradeErrorRate"),
    reviewCount: mapStatisticsCount(row.review_count, "reviewCount"),
    objectiveCount: mapStatisticsCount(row.objective_count, "objectiveCount"),
  };
  if (
    overview.totalTradeCount !== overview.closedTradeCount + overview.unresolvedTradeCount ||
    overview.closedTradeCount !== overview.winCount + overview.lossCount + overview.breakevenCount
  ) {
    throw new Error("Trading Overview invariants are invalid.");
  }
  return overview;
}

type PerformanceRow = {
  total_trade_count: string;
  closed_trade_count: string;
  unresolved_trade_count: string;
  win_count: string;
  loss_count: string;
  breakeven_count: string;
  win_rate: string | null;
  average_risk_basis_points: string | null;
  realized_pnl_by_currency: Json;
};

export function mapPerformanceMetrics(row: PerformanceRow): TradingPerformanceBreakdownMetrics {
  const metrics = {
    totalTradeCount: mapStatisticsCount(row.total_trade_count, "totalTradeCount"),
    closedTradeCount: mapStatisticsCount(row.closed_trade_count, "closedTradeCount"),
    unresolvedTradeCount: mapStatisticsCount(row.unresolved_trade_count, "unresolvedTradeCount"),
    winCount: mapStatisticsCount(row.win_count, "winCount"),
    lossCount: mapStatisticsCount(row.loss_count, "lossCount"),
    breakevenCount: mapStatisticsCount(row.breakeven_count, "breakevenCount"),
    winRate: rate(row.win_rate, "winRate"),
    averageRiskBasisPoints: nullableDecimal(
      row.average_risk_basis_points,
      "averageRiskBasisPoints",
    ),
    realizedPnlByCurrency: monetaryGroups(row.realized_pnl_by_currency),
  };
  if (
    metrics.totalTradeCount !== metrics.closedTradeCount + metrics.unresolvedTradeCount ||
    metrics.closedTradeCount !== metrics.winCount + metrics.lossCount + metrics.breakevenCount
  )
    throw new Error("Trading breakdown invariants are invalid.");
  return metrics;
}

export function mapSetupBreakdown(
  rows: Array<PerformanceRow & { setup_id: string; setup_name: string }>,
): TradingSetupBreakdown[] {
  return rows.map((row) => ({
    setupId: row.setup_id,
    setupName: row.setup_name,
    metrics: mapPerformanceMetrics(row),
  }));
}

export function mapSessionTypeBreakdown(
  rows: Array<PerformanceRow & { session_type: string }>,
): TradingSessionTypeBreakdown[] {
  return rows.map((row) => ({
    sessionType: row.session_type,
    metrics: mapPerformanceMetrics(row),
  }));
}

export function mapAssetBreakdown(
  rows: Array<PerformanceRow & { asset: string }>,
): TradingAssetBreakdown[] {
  return rows.map((row) => ({ asset: row.asset, metrics: mapPerformanceMetrics(row) }));
}

export function mapErrorBreakdown(
  rows: Array<{
    dimension: string;
    label: string;
    error_count: string;
    affected_trade_count: string;
  }>,
): TradingErrorBreakdown {
  const mapped = rows.map((row) => ({
    dimension: row.dimension,
    label: row.label,
    errorCount: mapStatisticsCount(row.error_count, "errorCount"),
    affectedTradeCount: mapStatisticsCount(row.affected_trade_count, "affectedTradeCount"),
  }));
  if (mapped.some((row) => row.dimension !== "category" && row.dimension !== "severity"))
    throw new Error("Trade Error breakdown dimension is malformed.");
  return {
    byCategory: mapped
      .filter((row) => row.dimension === "category")
      .map(({ label, errorCount, affectedTradeCount }) => ({
        category: label,
        errorCount,
        affectedTradeCount,
      })),
    bySeverity: mapped
      .filter((row) => row.dimension === "severity")
      .map(({ label, errorCount, affectedTradeCount }) => ({
        severity: label,
        errorCount,
        affectedTradeCount,
      })),
  };
}

const args = (filter: TradingStatisticsFilter) => ({
  filter_from: filter.from ?? undefined,
  filter_to: filter.to ?? undefined,
  filter_trading_account_id: filter.tradingAccountId ?? undefined,
});

export class TradingStatisticsRepository {
  constructor(private readonly client: PhoenixSupabaseClient) {}

  async getOverview(filter: TradingStatisticsFilter) {
    const { data, error } = await this.client.rpc("trading_statistics_overview", args(filter));
    return { overview: data?.[0] ? mapTradingOverviewRow(data[0]) : null, error };
  }

  async getSetupBreakdown(filter: TradingStatisticsFilter) {
    const { data, error } = await this.client.rpc("trading_statistics_by_setup", args(filter));
    return { breakdown: data ? mapSetupBreakdown(data) : null, error };
  }

  async getSessionTypeBreakdown(filter: TradingStatisticsFilter) {
    const { data, error } = await this.client.rpc(
      "trading_statistics_by_session_type",
      args(filter),
    );
    return { breakdown: data ? mapSessionTypeBreakdown(data) : null, error };
  }

  async getAssetBreakdown(filter: TradingStatisticsFilter) {
    const { data, error } = await this.client.rpc("trading_statistics_by_asset", args(filter));
    return { breakdown: data ? mapAssetBreakdown(data) : null, error };
  }

  async getTradeErrorBreakdown(filter: TradingStatisticsFilter) {
    const { data, error } = await this.client.rpc("trading_error_breakdown", args(filter));
    return { breakdown: data ? mapErrorBreakdown(data) : null, error };
  }
}
