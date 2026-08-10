import type { SupabaseClient } from "@supabase/supabase-js";
import { TradingSessionRepository } from "@/data/trading/trading-session-repository";
import {
  type CreateTradingSessionInput,
  TradingSessionValidationError,
  type UpdateTradingSessionInput,
  validateCreateTradingSession,
  validateUpdateTradingSession,
} from "@/domain/trading/trading-session";
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
  throw new TradingApplicationError("PERSISTENCE_ERROR", "The Trading Session could not be saved.");
}

export async function createTradingSession(
  client: SupabaseClient,
  input: CreateTradingSessionInput,
) {
  try {
    const result = await new TradingSessionRepository(client).create(
      await currentTraderId(client),
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

export async function listTradingSessions(client: SupabaseClient) {
  await currentTraderId(client);
  const result = await new TradingSessionRepository(client).listForCurrentTrader();
  if (result.error || !result.sessions) persistenceError();
  return result.sessions;
}

export async function getTradingSession(client: SupabaseClient, id: string) {
  await currentTraderId(client);
  const result = await new TradingSessionRepository(client).findByIdForCurrentTrader(id);
  if (result.error) persistenceError();
  if (!result.session)
    throw new TradingApplicationError("TRADING_SESSION_NOT_FOUND", "Trading Session not found.");
  return result.session;
}

export async function updateTradingSession(
  client: SupabaseClient,
  id: string,
  input: UpdateTradingSessionInput,
) {
  try {
    await currentTraderId(client);
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
