import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import { resolveCurrentTraderId } from "./current-trader";
import { TradingObjectiveRepository } from "@/data/trading/trading-objective-repository";
import {
  type CreateTradingObjectiveInput,
  TradingObjectiveValidationError,
  type UpdateTradingObjectiveInput,
  validateCreateTradingObjective,
  validateUpdateTradingObjective,
} from "@/domain/trading/trading-objective";
import { TradingApplicationError } from "./errors";

function persistenceError(): never {
  throw new TradingApplicationError(
    "PERSISTENCE_ERROR",
    "The Trading Objective could not be saved.",
  );
}

export async function createTradingObjective(
  client: PhoenixSupabaseClient,
  input: CreateTradingObjectiveInput,
) {
  try {
    const result = await new TradingObjectiveRepository(client).create(
      await resolveCurrentTraderId(client),
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

export async function listTradingObjectives(client: PhoenixSupabaseClient) {
  await resolveCurrentTraderId(client);
  const result = await new TradingObjectiveRepository(client).listForCurrentTrader();
  if (result.error || !result.objectives) persistenceError();
  return result.objectives;
}

export async function getTradingObjective(client: PhoenixSupabaseClient, id: string) {
  await resolveCurrentTraderId(client);
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
  client: PhoenixSupabaseClient,
  id: string,
  input: UpdateTradingObjectiveInput,
) {
  try {
    await resolveCurrentTraderId(client);
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
