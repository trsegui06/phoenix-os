"use server";

import type { TradingStatisticsFilter } from "@/domain/trading/trading-statistics";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradingApplicationError } from "@/services/trading/errors";
import {
  getTradingAssetBreakdown,
  getTradingErrorBreakdown,
  getTradingOverview,
  getTradingSessionTypeBreakdown,
  getTradingSetupBreakdown,
} from "@/services/trading/trading-statistics";

export async function getTradingOverviewAction(filter: TradingStatisticsFilter = {}) {
  const client = await getSupabaseServerClient();
  if (!client) throw new TradingApplicationError("UNAUTHENTICATED", "Supabase is not configured.");
  return getTradingOverview(client, filter);
}

async function client() {
  const result = await getSupabaseServerClient();
  if (!result) throw new TradingApplicationError("UNAUTHENTICATED", "Supabase is not configured.");
  return result;
}

export async function getTradingSetupBreakdownAction(filter: TradingStatisticsFilter = {}) {
  return getTradingSetupBreakdown(await client(), filter);
}

export async function getTradingSessionTypeBreakdownAction(filter: TradingStatisticsFilter = {}) {
  return getTradingSessionTypeBreakdown(await client(), filter);
}

export async function getTradingAssetBreakdownAction(filter: TradingStatisticsFilter = {}) {
  return getTradingAssetBreakdown(await client(), filter);
}

export async function getTradingErrorBreakdownAction(filter: TradingStatisticsFilter = {}) {
  return getTradingErrorBreakdown(await client(), filter);
}
