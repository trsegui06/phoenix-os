import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import { resolveCurrentTraderId } from "./current-trader";
import { TradeErrorRepository } from "@/data/trading/trade-error-repository";
import {
  type CreateTradeErrorInput,
  TradeErrorValidationError,
  type UpdateTradeErrorInput,
  validateCreateTradeError,
  validateUpdateTradeError,
} from "@/domain/trading/trade-error";
import { TradingApplicationError } from "./errors";

function persistenceError(): never {
  throw new TradingApplicationError("PERSISTENCE_ERROR", "The Trade Error could not be saved.");
}

export async function createTradeError(
  client: PhoenixSupabaseClient,
  input: CreateTradeErrorInput,
) {
  try {
    await resolveCurrentTraderId(client);
    const result = await new TradeErrorRepository(client).create(validateCreateTradeError(input));
    if (result.error || !result.tradeError) persistenceError();
    return result.tradeError;
  } catch (error) {
    if (error instanceof TradeErrorValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}

export async function listTradeErrors(client: PhoenixSupabaseClient) {
  await resolveCurrentTraderId(client);
  const result = await new TradeErrorRepository(client).listForCurrentTrader();
  if (result.error || !result.tradeErrors) persistenceError();
  return result.tradeErrors;
}

export async function getTradeError(client: PhoenixSupabaseClient, id: string) {
  await resolveCurrentTraderId(client);
  const result = await new TradeErrorRepository(client).findByIdForCurrentTrader(id);
  if (result.error) persistenceError();
  if (!result.tradeError)
    throw new TradingApplicationError("TRADING_TRADE_ERROR_NOT_FOUND", "Trade Error not found.");
  return result.tradeError;
}

export async function updateTradeError(
  client: PhoenixSupabaseClient,
  id: string,
  input: UpdateTradeErrorInput,
) {
  try {
    await resolveCurrentTraderId(client);
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
