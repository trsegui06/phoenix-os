"use server";

import type { CreateTradeInput, UpdateTradeInput } from "@/domain/trading/trade";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradingApplicationError } from "@/services/trading/errors";
import { createTrade, getTrade, listTrades, updateTrade } from "@/services/trading/trades";

async function client() {
  const result = await getSupabaseServerClient();
  if (!result) throw new TradingApplicationError("UNAUTHENTICATED", "Supabase is not configured.");
  return result;
}

export async function createTradeAction(input: CreateTradeInput) {
  return createTrade(await client(), input);
}

export async function listTradesAction() {
  return listTrades(await client());
}

export async function getTradeAction(id: string) {
  return getTrade(await client(), id);
}

export async function updateTradeAction(id: string, input: UpdateTradeInput) {
  return updateTrade(await client(), id, input);
}
