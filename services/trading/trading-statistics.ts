import { TradingStatisticsRepository } from "@/data/trading/trading-statistics-repository";
import {
  TradingStatisticsValidationError,
  type TradingStatisticsFilter,
  validateTradingStatisticsFilter,
} from "@/domain/trading/trading-statistics";
import type { PhoenixSupabaseClient } from "@/lib/supabase/types";

import { resolveCurrentTraderId } from "./current-trader";
import { TradingApplicationError } from "./errors";

export async function getTradingOverview(
  client: PhoenixSupabaseClient,
  filter: TradingStatisticsFilter = {},
) {
  try {
    const validated = validateTradingStatisticsFilter(filter);
    await resolveCurrentTraderId(client);
    const result = await new TradingStatisticsRepository(client).getOverview(validated);
    if (result.error || !result.overview) {
      throw new TradingApplicationError(
        "PERSISTENCE_ERROR",
        "The Trading Overview could not be loaded.",
      );
    }
    return result.overview;
  } catch (error) {
    if (error instanceof TradingStatisticsValidationError) {
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    }
    if (error instanceof TradingApplicationError) throw error;
    throw new TradingApplicationError(
      "PERSISTENCE_ERROR",
      "The Trading Overview could not be loaded.",
    );
  }
}

async function getBreakdown<T>(
  client: PhoenixSupabaseClient,
  filter: TradingStatisticsFilter,
  load: (
    repository: TradingStatisticsRepository,
    validated: TradingStatisticsFilter,
  ) => Promise<{
    breakdown: T | null;
    error: unknown;
  }>,
): Promise<T> {
  try {
    const validated = validateTradingStatisticsFilter(filter);
    await resolveCurrentTraderId(client);
    const result = await load(new TradingStatisticsRepository(client), validated);
    if (result.error || !result.breakdown) {
      throw new TradingApplicationError(
        "PERSISTENCE_ERROR",
        "The Trading Statistics breakdown could not be loaded.",
      );
    }
    return result.breakdown;
  } catch (error) {
    if (error instanceof TradingStatisticsValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    if (error instanceof TradingApplicationError) throw error;
    throw new TradingApplicationError(
      "PERSISTENCE_ERROR",
      "The Trading Statistics breakdown could not be loaded.",
    );
  }
}

export function getTradingSetupBreakdown(
  client: PhoenixSupabaseClient,
  filter: TradingStatisticsFilter = {},
) {
  return getBreakdown(client, filter, (repository, validated) =>
    repository.getSetupBreakdown(validated),
  );
}

export function getTradingSessionTypeBreakdown(
  client: PhoenixSupabaseClient,
  filter: TradingStatisticsFilter = {},
) {
  return getBreakdown(client, filter, (repository, validated) =>
    repository.getSessionTypeBreakdown(validated),
  );
}

export function getTradingAssetBreakdown(
  client: PhoenixSupabaseClient,
  filter: TradingStatisticsFilter = {},
) {
  return getBreakdown(client, filter, (repository, validated) =>
    repository.getAssetBreakdown(validated),
  );
}

export function getTradingErrorBreakdown(
  client: PhoenixSupabaseClient,
  filter: TradingStatisticsFilter = {},
) {
  return getBreakdown(client, filter, (repository, validated) =>
    repository.getTradeErrorBreakdown(validated),
  );
}
