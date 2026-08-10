"use server";

import type {
  CreateTradingSetupInput,
  UpdateTradingSetupInput,
} from "@/domain/trading/trading-setup";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradingApplicationError } from "@/services/trading/errors";
import {
  createTradingSetup,
  getTradingSetup,
  listTradingSetups,
  updateTradingSetup,
} from "@/services/trading/trading-setups";

async function client() {
  const result = await getSupabaseServerClient();
  if (!result) throw new TradingApplicationError("UNAUTHENTICATED", "Supabase is not configured.");
  return result;
}

export async function createTradingSetupAction(input: CreateTradingSetupInput) {
  return createTradingSetup(await client(), input);
}

export async function listTradingSetupsAction() {
  return listTradingSetups(await client());
}

export async function getTradingSetupAction(id: string) {
  return getTradingSetup(await client(), id);
}

export async function updateTradingSetupAction(id: string, input: UpdateTradingSetupInput) {
  return updateTradingSetup(await client(), id, input);
}
