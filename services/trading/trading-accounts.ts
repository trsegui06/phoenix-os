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
  const traderId = await resolveCurrentTraderId(c);
  const r = await new TradingAccountRepository(c).findByIdForCurrentTrader(id, traderId);
  if (r.error) fail(r.error);
  if (!r.account)
    throw new TradingAccountApplicationError(
      "TRADING_ACCOUNT_NOT_FOUND",
      "Trading Account not found.",
    );
  return r.account;
}
export async function deleteTradingAccount(c: PhoenixSupabaseClient, id: string) {
  const traderId = await resolveCurrentTraderId(c);
  const repository = new TradingAccountRepository(c);
  const account = await repository.findByIdForCurrentTrader(id, traderId);
  if (account.error) fail(account.error);
  if (!account.account)
    throw new TradingAccountApplicationError(
      "TRADING_ACCOUNT_NOT_FOUND",
      "Trading Account not found.",
    );
  const dependencies = await repository.countTrades(id, traderId);
  if (dependencies.error) fail(dependencies.error);
  if (dependencies.count !== 0)
    throw new TradingAccountApplicationError(
      "TRADING_ACCOUNT_IN_USE",
      "This account contains trading history and cannot be deleted. Set it inactive instead.",
    );
  const result = await repository.deleteForCurrentTrader(id, traderId);
  if (result.error) {
    if (result.error.code === "23503")
      throw new TradingAccountApplicationError(
        "TRADING_ACCOUNT_IN_USE",
        "This account contains trading history and cannot be deleted. Set it inactive instead.",
      );
    fail(result.error);
  }
  if (!result.deleted) {
    const racedDependencies = await repository.countTrades(id, traderId);
    if (racedDependencies.error) fail(racedDependencies.error);
    if (racedDependencies.count !== 0)
      throw new TradingAccountApplicationError(
        "TRADING_ACCOUNT_IN_USE",
        "This account contains trading history and cannot be deleted. Set it inactive instead.",
      );
    throw new TradingAccountApplicationError(
      "TRADING_ACCOUNT_NOT_FOUND",
      "Trading Account not found.",
    );
  }
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
