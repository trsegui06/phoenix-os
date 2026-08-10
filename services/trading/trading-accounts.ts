import type { SupabaseClient } from "@supabase/supabase-js";
import { TradingAccountRepository } from "@/data/trading/trading-account-repository";
import {
  TradingAccountValidationError,
  validateCreateTradingAccount,
  validateUpdateTradingAccount,
  type CreateTradingAccountInput,
  type UpdateTradingAccountInput,
} from "@/domain/trading/trading-account";
import { TradingAccountApplicationError } from "./errors";
async function trader(c: SupabaseClient) {
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user)
    throw new TradingAccountApplicationError("UNAUTHENTICATED", "Authentication is required.");
  const { data, error } = await c
    .from("traders")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error)
    throw new TradingAccountApplicationError(
      "PERSISTENCE_ERROR",
      "Unable to resolve the Trader profile.",
    );
  if (!data)
    throw new TradingAccountApplicationError(
      "TRADER_PROFILE_NOT_FOUND",
      "A Trader profile is required.",
    );
  return String((data as { id: string }).id);
}
const fail = (e: { code?: string } | null) => {
  throw new TradingAccountApplicationError(
    e?.code === "23505" ? "CONFLICT" : "PERSISTENCE_ERROR",
    e?.code === "23505"
      ? "A Trading Account with this broker and name already exists."
      : "The Trading Account could not be saved.",
  );
};
export async function createTradingAccount(c: SupabaseClient, i: CreateTradingAccountInput) {
  try {
    const r = await new TradingAccountRepository(c).create(
      await trader(c),
      validateCreateTradingAccount(i),
    );
    if (r.error) fail(r.error);
    return r.account!;
  } catch (e) {
    if (e instanceof TradingAccountValidationError)
      throw new TradingAccountApplicationError("VALIDATION_ERROR", e.message);
    throw e;
  }
}
export async function listTradingAccounts(c: SupabaseClient) {
  await trader(c);
  const r = await new TradingAccountRepository(c).listForCurrentTrader();
  if (r.error) fail(r.error);
  return r.accounts!;
}
export async function getTradingAccount(c: SupabaseClient, id: string) {
  await trader(c);
  const r = await new TradingAccountRepository(c).findByIdForCurrentTrader(id);
  if (r.error) fail(r.error);
  if (!r.account)
    throw new TradingAccountApplicationError(
      "TRADING_ACCOUNT_NOT_FOUND",
      "Trading Account not found.",
    );
  return r.account;
}
export async function updateTradingAccount(
  c: SupabaseClient,
  id: string,
  i: UpdateTradingAccountInput,
) {
  try {
    await trader(c);
    const r = await new TradingAccountRepository(c).updateForCurrentTrader(
      id,
      validateUpdateTradingAccount(i),
    );
    if (r.error) fail(r.error);
    if (!r.account)
      throw new TradingAccountApplicationError(
        "TRADING_ACCOUNT_NOT_FOUND",
        "Trading Account not found.",
      );
    return r.account;
  } catch (e) {
    if (e instanceof TradingAccountValidationError)
      throw new TradingAccountApplicationError("VALIDATION_ERROR", e.message);
    throw e;
  }
}
