import type { SupabaseClient } from "@supabase/supabase-js";
import { TradingSetupRepository } from "@/data/trading/trading-setup-repository";
import {
  type CreateTradingSetupInput,
  TradingSetupValidationError,
  type UpdateTradingSetupInput,
  validateCreateTradingSetup,
  validateUpdateTradingSetup,
} from "@/domain/trading/trading-setup";
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

function persistenceError(error: { code?: string } | null): never {
  if (error?.code === "23505")
    throw new TradingApplicationError("CONFLICT", "A Trading Setup with this name already exists.");
  throw new TradingApplicationError("PERSISTENCE_ERROR", "The Trading Setup could not be saved.");
}

export async function createTradingSetup(client: SupabaseClient, input: CreateTradingSetupInput) {
  try {
    const result = await new TradingSetupRepository(client).create(
      await currentTraderId(client),
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

export async function listTradingSetups(client: SupabaseClient) {
  await currentTraderId(client);
  const result = await new TradingSetupRepository(client).listForCurrentTrader();
  if (result.error || !result.setups) persistenceError(result.error);
  return result.setups;
}

export async function getTradingSetup(client: SupabaseClient, id: string) {
  await currentTraderId(client);
  const result = await new TradingSetupRepository(client).findByIdForCurrentTrader(id);
  if (result.error) persistenceError(result.error);
  if (!result.setup)
    throw new TradingApplicationError("TRADING_SETUP_NOT_FOUND", "Trading Setup not found.");
  return result.setup;
}

export async function updateTradingSetup(
  client: SupabaseClient,
  id: string,
  input: UpdateTradingSetupInput,
) {
  try {
    await currentTraderId(client);
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
