export type TradingStatisticsFilter = {
  from?: string;
  to?: string;
  tradingAccountId?: string;
};

export type TradingOverview = {
  totalTradeCount: number;
  closedTradeCount: number;
  unresolvedTradeCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number | null;
  averageRiskBasisPoints: string | null;
  realizedPnlByCurrency: Array<{
    currency: string;
    realizedPnlCents: string;
    averagePnlCents: string;
    grossProfitCents: string;
    grossLossCents: string;
  }>;
  tradeErrorCount: number;
  tradesWithErrorsCount: number;
  tradeErrorRate: number | null;
  reviewCount: number;
  objectiveCount: number;
};

export class TradingStatisticsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradingStatisticsValidationError";
  }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function date(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TradingStatisticsValidationError(`${field} must be a valid YYYY-MM-DD date.`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new TradingStatisticsValidationError(`${field} must be a valid YYYY-MM-DD date.`);
  }
  return value;
}

/**
 * Trade and Trade Error metrics use all three filters. Review count uses only
 * date-overlap; Objective count is Trader-wide. These scopes are intentional v1 semantics.
 */
export function validateTradingStatisticsFilter(
  filter: TradingStatisticsFilter = {},
): TradingStatisticsFilter {
  const result: TradingStatisticsFilter = {};
  if (filter.from !== undefined) result.from = date(filter.from, "from");
  if (filter.to !== undefined) result.to = date(filter.to, "to");
  if (result.from && result.to && result.to < result.from) {
    throw new TradingStatisticsValidationError("to must not precede from.");
  }
  if (filter.tradingAccountId !== undefined) {
    if (typeof filter.tradingAccountId !== "string" || !uuid.test(filter.tradingAccountId)) {
      throw new TradingStatisticsValidationError("tradingAccountId must be a valid UUID.");
    }
    result.tradingAccountId = filter.tradingAccountId;
  }
  return result;
}
