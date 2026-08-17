import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import { resolveCurrentTraderId } from "./current-trader";
import { TradingSessionRepository } from "@/data/trading/trading-session-repository";
import {
  type CreateTradingSessionInput,
  TradingSessionValidationError,
  type UpdateTradingSessionInput,
  validateCreateTradingSession,
  validateUpdateTradingSession,
} from "@/domain/trading/trading-session";
import { TradingApplicationError } from "./errors";

function persistenceError(): never {
  throw new TradingApplicationError("PERSISTENCE_ERROR", "The Trading Session could not be saved.");
}

export async function createTradingSession(
  client: PhoenixSupabaseClient,
  input: CreateTradingSessionInput,
) {
  try {
    const result = await new TradingSessionRepository(client).create(
      await resolveCurrentTraderId(client),
      validateCreateTradingSession(input),
    );
    if (result.error || !result.session) persistenceError();
    return result.session;
  } catch (error) {
    if (error instanceof TradingSessionValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}

export async function listTradingSessions(client: PhoenixSupabaseClient) {
  await resolveCurrentTraderId(client);
  const result = await new TradingSessionRepository(client).listForCurrentTrader();
  if (result.error || !result.sessions) persistenceError();
  return result.sessions;
}

export async function getTradingSession(client: PhoenixSupabaseClient, id: string) {
  await resolveCurrentTraderId(client);
  const result = await new TradingSessionRepository(client).findByIdForCurrentTrader(id);
  if (result.error) persistenceError();
  if (!result.session)
    throw new TradingApplicationError("TRADING_SESSION_NOT_FOUND", "Trading Session not found.");
  return result.session;
}

export async function updateTradingSession(
  client: PhoenixSupabaseClient,
  id: string,
  input: UpdateTradingSessionInput,
) {
  try {
    await resolveCurrentTraderId(client);
    const result = await new TradingSessionRepository(client).updateForCurrentTrader(
      id,
      validateUpdateTradingSession(input),
    );
    if (result.error) persistenceError();
    if (!result.session)
      throw new TradingApplicationError("TRADING_SESSION_NOT_FOUND", "Trading Session not found.");
    return result.session;
  } catch (error) {
    if (error instanceof TradingSessionValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}
