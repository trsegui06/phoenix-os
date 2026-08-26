import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import type {
  ReviewObjectiveOption,
  ReviewTradeOption,
} from "@/components/trading/reviews/review-form";
import { getTrade, listRecentTrades } from "@/services/trading/trades";
import { listTradingAccounts } from "@/services/trading/trading-accounts";
import { getTradingObjective, listTradingObjectives } from "@/services/trading/trading-objectives";

function formatMoney(cents: number, currency: string) {
  const sign = cents < 0 ? "−" : cents > 0 ? "+" : "";
  return `${sign}${(Math.abs(cents) / 100).toFixed(2)} ${currency}`;
}

export async function getReviewFormOptions(
  client: PhoenixSupabaseClient,
  linkedTradeIds: string[] = [],
) {
  const [recent, accounts, objectives] = await Promise.all([
    listRecentTrades(client, 200),
    listTradingAccounts(client),
    listTradingObjectives(client),
  ]);
  const recentIds = new Set(recent.map((trade) => trade.id));
  const missing = linkedTradeIds.filter((id) => !recentIds.has(id));
  const linked = await Promise.all(missing.map((id) => getTrade(client, id)));
  const currencies = new Map(accounts.map((account) => [account.id, account.currency]));
  const trades: ReviewTradeOption[] = [...recent, ...linked].map((trade) => ({
    id: trade.id,
    tradeDate: trade.tradeDate,
    asset: trade.asset,
    direction: trade.direction,
    result: trade.result,
    pnlLabel:
      trade.pnlCents === null
        ? null
        : formatMoney(trade.pnlCents, currencies.get(trade.tradingAccountId) ?? "currency unknown"),
  }));
  const objectiveOptions: ReviewObjectiveOption[] = objectives.map((objective) => ({
    id: objective.id,
    title: objective.title,
    status: objective.status,
    category: objective.category,
    targetDate: objective.targetDate,
  }));
  return { trades, objectives: objectiveOptions };
}

export async function getReviewLinkedData(
  client: PhoenixSupabaseClient,
  tradeIds: string[],
  objectiveIds: string[],
) {
  const [trades, objectives, accounts] = await Promise.all([
    Promise.all(tradeIds.map((id) => getTrade(client, id))),
    Promise.all(objectiveIds.map((id) => getTradingObjective(client, id))),
    listTradingAccounts(client),
  ]);
  const currencies = new Map(accounts.map((account) => [account.id, account.currency]));
  return {
    trades: trades.map((trade) => ({
      ...trade,
      pnlLabel:
        trade.pnlCents === null
          ? null
          : formatMoney(
              trade.pnlCents,
              currencies.get(trade.tradingAccountId) ?? "currency unknown",
            ),
    })),
    objectives,
  };
}
