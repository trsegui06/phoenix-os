import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import { resolveCurrentTraderId } from "./current-trader";
import { TradeRepository } from "@/data/trading/trade-repository";
import {
  type CreateTradeInput,
  TradeValidationError,
  type UpdateTradeInput,
  validateCreateTrade,
  validateUpdateTrade,
} from "@/domain/trading/trade";
import { TradingApplicationError } from "./errors";

function persistenceError(): never {
  throw new TradingApplicationError("PERSISTENCE_ERROR", "The Trade could not be saved.");
}

export async function createTrade(client: PhoenixSupabaseClient, input: CreateTradeInput) {
  try {
    const result = await new TradeRepository(client).create(
      await resolveCurrentTraderId(client),
      validateCreateTrade(input),
    );
    if (result.error || !result.trade) persistenceError();
    return result.trade;
  } catch (error) {
    if (error instanceof TradeValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}

export async function listTrades(client: PhoenixSupabaseClient) {
  await resolveCurrentTraderId(client);
  const result = await new TradeRepository(client).listForCurrentTrader();
  if (result.error || !result.trades) persistenceError();
  return result.trades;
}

export async function getTrade(client: PhoenixSupabaseClient, id: string) {
  await resolveCurrentTraderId(client);
  const result = await new TradeRepository(client).findByIdForCurrentTrader(id);
  if (result.error) persistenceError();
  if (!result.trade)
    throw new TradingApplicationError("TRADING_TRADE_NOT_FOUND", "Trade not found.");
  return result.trade;
}

export async function updateTrade(
  client: PhoenixSupabaseClient,
  id: string,
  input: UpdateTradeInput,
) {
  try {
    await resolveCurrentTraderId(client);
    const result = await new TradeRepository(client).updateForCurrentTrader(
      id,
      validateUpdateTrade(input),
    );
    if (result.error) persistenceError();
    if (!result.trade)
      throw new TradingApplicationError("TRADING_TRADE_NOT_FOUND", "Trade not found.");
    return result.trade;
  } catch (error) {
    if (error instanceof TradeValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}
