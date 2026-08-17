import type { Json } from "@/lib/supabase/database.types";
import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import type { TradingOverview, TradingStatisticsFilter } from "@/domain/trading/trading-statistics";

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

function count(value: unknown, field: string): number {
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
    totalTradeCount: count(row.total_trade_count, "totalTradeCount"),
    closedTradeCount: count(row.closed_trade_count, "closedTradeCount"),
    unresolvedTradeCount: count(row.unresolved_trade_count, "unresolvedTradeCount"),
    winCount: count(row.win_count, "winCount"),
    lossCount: count(row.loss_count, "lossCount"),
    breakevenCount: count(row.breakeven_count, "breakevenCount"),
    winRate: rate(row.win_rate, "winRate"),
    averageRiskBasisPoints: nullableDecimal(
      row.average_risk_basis_points,
      "averageRiskBasisPoints",
    ),
    realizedPnlByCurrency: monetaryGroups(row.realized_pnl_by_currency),
    tradeErrorCount: count(row.trade_error_count, "tradeErrorCount"),
    tradesWithErrorsCount: count(row.trades_with_errors_count, "tradesWithErrorsCount"),
    tradeErrorRate: rate(row.trade_error_rate, "tradeErrorRate"),
    reviewCount: count(row.review_count, "reviewCount"),
    objectiveCount: count(row.objective_count, "objectiveCount"),
  };
  if (
    overview.totalTradeCount !== overview.closedTradeCount + overview.unresolvedTradeCount ||
    overview.closedTradeCount !== overview.winCount + overview.lossCount + overview.breakevenCount
  ) {
    throw new Error("Trading Overview invariants are invalid.");
  }
  return overview;
}

export class TradingStatisticsRepository {
  constructor(private readonly client: PhoenixSupabaseClient) {}

  async getOverview(filter: TradingStatisticsFilter) {
    const { data, error } = await this.client.rpc("trading_statistics_overview", {
      filter_from: filter.from ?? undefined,
      filter_to: filter.to ?? undefined,
      filter_trading_account_id: filter.tradingAccountId ?? undefined,
    });
    return { overview: data?.[0] ? mapTradingOverviewRow(data[0]) : null, error };
  }
}
