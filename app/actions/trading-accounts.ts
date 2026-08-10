"use server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradingAccountApplicationError } from "@/services/trading/errors";
import {
  createTradingAccount,
  getTradingAccount,
  listTradingAccounts,
  updateTradingAccount,
} from "@/services/trading/trading-accounts";
import type {
  CreateTradingAccountInput,
  UpdateTradingAccountInput,
} from "@/domain/trading/trading-account";
async function c() {
  const x = await getSupabaseServerClient();
  if (!x)
    throw new TradingAccountApplicationError("UNAUTHENTICATED", "Supabase is not configured.");
  return x;
}
export async function createTradingAccountAction(i: CreateTradingAccountInput) {
  return createTradingAccount(await c(), i);
}
export async function listTradingAccountsAction() {
  return listTradingAccounts(await c());
}
export async function getTradingAccountAction(id: string) {
  return getTradingAccount(await c(), id);
}
export async function updateTradingAccountAction(id: string, i: UpdateTradingAccountInput) {
  return updateTradingAccount(await c(), id, i);
}
