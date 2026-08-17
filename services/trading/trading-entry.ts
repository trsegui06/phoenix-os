import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import { adaptTradeEntry, type TradeEntryInput } from "@/lib/trading-entry";
import { resolveCurrentTraderId } from "./current-trader";
import { TradingApplicationError } from "./errors";

export async function createTradeEntry(client: PhoenixSupabaseClient, input: TradeEntryInput) {
  await resolveCurrentTraderId(client);
  const { trade, errors } = adaptTradeEntry(input);
  const { data, error } = await client.rpc("create_trade_with_errors", {
    target_trading_account_id: trade.tradingAccountId,
    target_session_id: trade.sessionId,
    target_setup_id: trade.setupId,
    target_trade_date: trade.tradeDate,
    target_asset: trade.asset,
    target_direction: trade.direction,
    target_entry_price: trade.entryPrice,
    target_stop_loss: trade.stopLoss,
    target_take_profit: trade.takeProfit,
    ...(trade.exitPrice != null ? { target_exit_price: trade.exitPrice } : {}),
    target_risk_basis_points: trade.riskBasisPoints,
    target_position_size: trade.positionSize,
    target_result: trade.result,
    ...(trade.pnlCents != null ? { target_pnl_cents: trade.pnlCents } : {}),
    ...(trade.executionQuality != null ? { target_execution_quality: trade.executionQuality } : {}),
    ...(trade.notes != null ? { target_notes: trade.notes } : {}),
    target_errors: errors,
  });
  if (error || !data)
    throw new TradingApplicationError("PERSISTENCE_ERROR", "The Trade entry could not be saved.");
  return data;
}
