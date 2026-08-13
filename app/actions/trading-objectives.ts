"use server";

import type {
  CreateTradingObjectiveInput,
  UpdateTradingObjectiveInput,
} from "@/domain/trading/trading-objective";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradingApplicationError } from "@/services/trading/errors";
import {
  createTradingObjective,
  getTradingObjective,
  listTradingObjectives,
  updateTradingObjective,
} from "@/services/trading/trading-objectives";

async function client() {
  const result = await getSupabaseServerClient();
  if (!result) throw new TradingApplicationError("UNAUTHENTICATED", "Supabase is not configured.");
  return result;
}

export async function createTradingObjectiveAction(input: CreateTradingObjectiveInput) {
  return createTradingObjective(await client(), input);
}

export async function listTradingObjectivesAction() {
  return listTradingObjectives(await client());
}

export async function getTradingObjectiveAction(id: string) {
  return getTradingObjective(await client(), id);
}

export async function updateTradingObjectiveAction(id: string, input: UpdateTradingObjectiveInput) {
  return updateTradingObjective(await client(), id, input);
}
