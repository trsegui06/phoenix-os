import { TraderRepository } from "@/data/trading/trader-repository";
import {
  TraderValidationError,
  validateCreateTrader,
  type CreateTraderInput,
} from "@/domain/trading/trader";
import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import { TradingApplicationError } from "./errors";

async function currentUserId(client: PhoenixSupabaseClient) {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new TradingApplicationError("UNAUTHENTICATED", "Authentication is required.");
  return user.id;
}

export async function hasCurrentTrader(client: PhoenixSupabaseClient) {
  const userId = await currentUserId(client);
  const { data, error } = await new TraderRepository(client).findForAuthUser(userId);
  if (error)
    throw new TradingApplicationError("PERSISTENCE_ERROR", "Unable to check the Trader profile.");
  return Boolean(data);
}

export async function provisionCurrentTrader(
  client: PhoenixSupabaseClient,
  input: CreateTraderInput,
) {
  try {
    const userId = await currentUserId(client);
    const repository = new TraderRepository(client);
    const existing = await repository.findForAuthUser(userId);
    if (existing.error)
      throw new TradingApplicationError(
        "PERSISTENCE_ERROR",
        "The Trader profile could not be created.",
      );
    if (existing.data)
      throw new TradingApplicationError("CONFLICT", "A Trader profile already exists.");
    const result = await repository.createForAuthUser(userId, validateCreateTrader(input));
    if (result.error) {
      if (result.error.code === "23505")
        throw new TradingApplicationError("CONFLICT", "A Trader profile already exists.");
      throw new TradingApplicationError(
        "PERSISTENCE_ERROR",
        "The Trader profile could not be created.",
      );
    }
    return result.data;
  } catch (error) {
    if (error instanceof TraderValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}
