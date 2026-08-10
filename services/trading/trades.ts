import type { SupabaseClient } from "@supabase/supabase-js";
import { TradeRepository } from "@/data/trading/trade-repository";
import {
  type CreateTradeInput,
  TradeValidationError,
  type UpdateTradeInput,
  validateCreateTrade,
  validateUpdateTrade,
} from "@/domain/trading/trade";
import { TradingApplicationError } from "./errors";

async function currentTraderId(client: SupabaseClient) {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new TradingApplicationError("UNAUTHENTICATED", "Authentication is required.");
  const { data, error } = await client
    .from("traders")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error)
    throw new TradingApplicationError("PERSISTENCE_ERROR", "Unable to resolve the Trader profile.");
  if (!data)
    throw new TradingApplicationError("TRADER_PROFILE_NOT_FOUND", "A Trader profile is required.");
  return String((data as { id: string }).id);
}

function persistenceError(): never {
  throw new TradingApplicationError("PERSISTENCE_ERROR", "The Trade could not be saved.");
}

export async function createTrade(client: SupabaseClient, input: CreateTradeInput) {
  try {
    const result = await new TradeRepository(client).create(
      await currentTraderId(client),
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

export async function listTrades(client: SupabaseClient) {
  await currentTraderId(client);
  const result = await new TradeRepository(client).listForCurrentTrader();
  if (result.error || !result.trades) persistenceError();
  return result.trades;
}

export async function getTrade(client: SupabaseClient, id: string) {
  await currentTraderId(client);
  const result = await new TradeRepository(client).findByIdForCurrentTrader(id);
  if (result.error) persistenceError();
  if (!result.trade)
    throw new TradingApplicationError("TRADING_TRADE_NOT_FOUND", "Trade not found.");
  return result.trade;
}

export async function updateTrade(client: SupabaseClient, id: string, input: UpdateTradeInput) {
  try {
    await currentTraderId(client);
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
