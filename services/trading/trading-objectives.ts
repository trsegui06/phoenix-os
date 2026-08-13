import type { SupabaseClient } from "@supabase/supabase-js";
import { TradingObjectiveRepository } from "@/data/trading/trading-objective-repository";
import {
  type CreateTradingObjectiveInput,
  TradingObjectiveValidationError,
  type UpdateTradingObjectiveInput,
  validateCreateTradingObjective,
  validateUpdateTradingObjective,
} from "@/domain/trading/trading-objective";
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
  throw new TradingApplicationError(
    "PERSISTENCE_ERROR",
    "The Trading Objective could not be saved.",
  );
}

export async function createTradingObjective(
  client: SupabaseClient,
  input: CreateTradingObjectiveInput,
) {
  try {
    const result = await new TradingObjectiveRepository(client).create(
      await currentTraderId(client),
      validateCreateTradingObjective(input),
    );
    if (result.error || !result.objective) persistenceError();
    return result.objective;
  } catch (error) {
    if (error instanceof TradingObjectiveValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}

export async function listTradingObjectives(client: SupabaseClient) {
  await currentTraderId(client);
  const result = await new TradingObjectiveRepository(client).listForCurrentTrader();
  if (result.error || !result.objectives) persistenceError();
  return result.objectives;
}

export async function getTradingObjective(client: SupabaseClient, id: string) {
  await currentTraderId(client);
  const result = await new TradingObjectiveRepository(client).findByIdForCurrentTrader(id);
  if (result.error) persistenceError();
  if (!result.objective)
    throw new TradingApplicationError(
      "TRADING_OBJECTIVE_NOT_FOUND",
      "Trading Objective not found.",
    );
  return result.objective;
}

export async function updateTradingObjective(
  client: SupabaseClient,
  id: string,
  input: UpdateTradingObjectiveInput,
) {
  try {
    await currentTraderId(client);
    const result = await new TradingObjectiveRepository(client).updateForCurrentTrader(
      id,
      validateUpdateTradingObjective(input),
    );
    if (result.error) persistenceError();
    if (!result.objective)
      throw new TradingApplicationError(
        "TRADING_OBJECTIVE_NOT_FOUND",
        "Trading Objective not found.",
      );
    return result.objective;
  } catch (error) {
    if (error instanceof TradingObjectiveValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}
