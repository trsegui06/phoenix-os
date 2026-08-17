import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import { resolveCurrentTraderId } from "./current-trader";
import { TradingSetupRepository } from "@/data/trading/trading-setup-repository";
import {
  type CreateTradingSetupInput,
  TradingSetupValidationError,
  type UpdateTradingSetupInput,
  validateCreateTradingSetup,
  validateUpdateTradingSetup,
} from "@/domain/trading/trading-setup";
import { TradingApplicationError } from "./errors";

function persistenceError(error: { code?: string } | null): never {
  if (error?.code === "23505")
    throw new TradingApplicationError("CONFLICT", "A Trading Setup with this name already exists.");
  throw new TradingApplicationError("PERSISTENCE_ERROR", "The Trading Setup could not be saved.");
}

export async function createTradingSetup(
  client: PhoenixSupabaseClient,
  input: CreateTradingSetupInput,
) {
  try {
    const result = await new TradingSetupRepository(client).create(
      await resolveCurrentTraderId(client),
      validateCreateTradingSetup(input),
    );
    if (result.error || !result.setup) persistenceError(result.error);
    return result.setup;
  } catch (error) {
    if (error instanceof TradingSetupValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}

export async function listTradingSetups(client: PhoenixSupabaseClient) {
  await resolveCurrentTraderId(client);
  const result = await new TradingSetupRepository(client).listForCurrentTrader();
  if (result.error || !result.setups) persistenceError(result.error);
  return result.setups;
}

export async function getTradingSetup(client: PhoenixSupabaseClient, id: string) {
  await resolveCurrentTraderId(client);
  const result = await new TradingSetupRepository(client).findByIdForCurrentTrader(id);
  if (result.error) persistenceError(result.error);
  if (!result.setup)
    throw new TradingApplicationError("TRADING_SETUP_NOT_FOUND", "Trading Setup not found.");
  return result.setup;
}

export async function updateTradingSetup(
  client: PhoenixSupabaseClient,
  id: string,
  input: UpdateTradingSetupInput,
) {
  try {
    await resolveCurrentTraderId(client);
    const result = await new TradingSetupRepository(client).updateForCurrentTrader(
      id,
      validateUpdateTradingSetup(input),
    );
    if (result.error) persistenceError(result.error);
    if (!result.setup)
      throw new TradingApplicationError("TRADING_SETUP_NOT_FOUND", "Trading Setup not found.");
    return result.setup;
  } catch (error) {
    if (error instanceof TradingSetupValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}
