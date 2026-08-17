import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import { resolveCurrentTraderId } from "./current-trader";
import { TradingAccountRepository } from "@/data/trading/trading-account-repository";
import {
  TradingAccountValidationError,
  validateCreateTradingAccount,
  validateUpdateTradingAccount,
  type CreateTradingAccountInput,
  type UpdateTradingAccountInput,
} from "@/domain/trading/trading-account";
import { TradingAccountApplicationError } from "./errors";
const fail = (e: { code?: string } | null) => {
  throw new TradingAccountApplicationError(
    e?.code === "23505" ? "CONFLICT" : "PERSISTENCE_ERROR",
    e?.code === "23505"
      ? "A Trading Account with this broker and name already exists."
      : "The Trading Account could not be saved.",
  );
};
export async function createTradingAccount(c: PhoenixSupabaseClient, i: CreateTradingAccountInput) {
  try {
    const r = await new TradingAccountRepository(c).create(
      await resolveCurrentTraderId(c),
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
export async function listTradingAccounts(c: PhoenixSupabaseClient) {
  await resolveCurrentTraderId(c);
  const r = await new TradingAccountRepository(c).listForCurrentTrader();
  if (r.error) fail(r.error);
  return r.accounts!;
}
export async function getTradingAccount(c: PhoenixSupabaseClient, id: string) {
  await resolveCurrentTraderId(c);
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
  c: PhoenixSupabaseClient,
  id: string,
  i: UpdateTradingAccountInput,
) {
  try {
    await resolveCurrentTraderId(c);
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
