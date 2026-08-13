import type { SupabaseClient } from "@supabase/supabase-js";
import { TradeErrorRepository } from "@/data/trading/trade-error-repository";
import {
  type CreateTradeErrorInput,
  TradeErrorValidationError,
  type UpdateTradeErrorInput,
  validateCreateTradeError,
  validateUpdateTradeError,
} from "@/domain/trading/trade-error";
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
  throw new TradingApplicationError("PERSISTENCE_ERROR", "The Trade Error could not be saved.");
}

export async function createTradeError(client: SupabaseClient, input: CreateTradeErrorInput) {
  try {
    await currentTraderId(client);
    const result = await new TradeErrorRepository(client).create(validateCreateTradeError(input));
    if (result.error || !result.tradeError) persistenceError();
    return result.tradeError;
  } catch (error) {
    if (error instanceof TradeErrorValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}

export async function listTradeErrors(client: SupabaseClient) {
  await currentTraderId(client);
  const result = await new TradeErrorRepository(client).listForCurrentTrader();
  if (result.error || !result.tradeErrors) persistenceError();
  return result.tradeErrors;
}

export async function getTradeError(client: SupabaseClient, id: string) {
  await currentTraderId(client);
  const result = await new TradeErrorRepository(client).findByIdForCurrentTrader(id);
  if (result.error) persistenceError();
  if (!result.tradeError)
    throw new TradingApplicationError("TRADING_TRADE_ERROR_NOT_FOUND", "Trade Error not found.");
  return result.tradeError;
}

export async function updateTradeError(
  client: SupabaseClient,
  id: string,
  input: UpdateTradeErrorInput,
) {
  try {
    await currentTraderId(client);
    const result = await new TradeErrorRepository(client).updateForCurrentTrader(
      id,
      validateUpdateTradeError(input),
    );
    if (result.error) persistenceError();
    if (!result.tradeError)
      throw new TradingApplicationError("TRADING_TRADE_ERROR_NOT_FOUND", "Trade Error not found.");
    return result.tradeError;
  } catch (error) {
    if (error instanceof TradeErrorValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}
