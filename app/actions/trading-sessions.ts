"use server";

import type {
  CreateTradingSessionInput,
  UpdateTradingSessionInput,
} from "@/domain/trading/trading-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradingApplicationError } from "@/services/trading/errors";
import {
  createTradingSession,
  getTradingSession,
  listTradingSessions,
  updateTradingSession,
} from "@/services/trading/trading-sessions";

async function client() {
  const result = await getSupabaseServerClient();
  if (!result) throw new TradingApplicationError("UNAUTHENTICATED", "Supabase is not configured.");
  return result;
}

export async function createTradingSessionAction(input: CreateTradingSessionInput) {
  return createTradingSession(await client(), input);
}

export async function listTradingSessionsAction() {
  return listTradingSessions(await client());
}

export async function getTradingSessionAction(id: string) {
  return getTradingSession(await client(), id);
}

export async function updateTradingSessionAction(id: string, input: UpdateTradingSessionInput) {
  return updateTradingSession(await client(), id, input);
}
