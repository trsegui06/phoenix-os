"use server";

import type { CreateTradeErrorInput, UpdateTradeErrorInput } from "@/domain/trading/trade-error";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradingApplicationError } from "@/services/trading/errors";
import {
  createTradeError,
  getTradeError,
  listTradeErrors,
  updateTradeError,
} from "@/services/trading/trade-errors";

async function client() {
  const result = await getSupabaseServerClient();
  if (!result) throw new TradingApplicationError("UNAUTHENTICATED", "Supabase is not configured.");
  return result;
}

export async function createTradeErrorAction(input: CreateTradeErrorInput) {
  return createTradeError(await client(), input);
}

export async function listTradeErrorsAction() {
  return listTradeErrors(await client());
}

export async function getTradeErrorAction(id: string) {
  return getTradeError(await client(), id);
}

export async function updateTradeErrorAction(id: string, input: UpdateTradeErrorInput) {
  return updateTradeError(await client(), id, input);
}
