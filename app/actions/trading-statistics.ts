"use server";

import type { TradingStatisticsFilter } from "@/domain/trading/trading-statistics";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradingApplicationError } from "@/services/trading/errors";
import { getTradingOverview } from "@/services/trading/trading-statistics";

export async function getTradingOverviewAction(filter: TradingStatisticsFilter = {}) {
  const client = await getSupabaseServerClient();
  if (!client) throw new TradingApplicationError("UNAUTHENTICATED", "Supabase is not configured.");
  return getTradingOverview(client, filter);
}
