import { describe, expect, it } from "vitest";
import { TradingAccountApplicationError } from "@/services/trading/errors";
import {
  TradingAccountValidationError,
  validateCreateTradingAccount,
  validateUpdateTradingAccount,
} from "@/domain/trading/trading-account";

const valid = {
  broker: " Broker ",
  accountName: " Account ",
  accountType: " Cash ",
  currency: " eur ",
  initialBalanceCents: 0,
  status: " Active ",
};
describe("Trading Account validation", () => {
  it("normalizes required text and currency", () =>
    expect(validateCreateTradingAccount(valid)).toMatchObject({
      broker: "Broker",
      accountName: "Account",
      accountType: "Cash",
      currency: "EUR",
      status: "Active",
    }));
  it("rejects empty required fields and invalid currencies", () => {
    expect(() => validateCreateTradingAccount({ ...valid, broker: " " })).toThrow(
      TradingAccountValidationError,
    );
    expect(() => validateCreateTradingAccount({ ...valid, currency: "EU" })).toThrow(
      TradingAccountValidationError,
    );
    expect(() => validateCreateTradingAccount({ ...valid, currency: "E1R" })).toThrow(
      TradingAccountValidationError,
    );
  });
  it("requires integer non-negative balances", () => {
    expect(() => validateCreateTradingAccount({ ...valid, initialBalanceCents: -1 })).toThrow(
      TradingAccountValidationError,
    );
    expect(() => validateCreateTradingAccount({ ...valid, initialBalanceCents: 1.2 })).toThrow(
      TradingAccountValidationError,
    );
  });
  it("enforces the balance snapshot pair", () => {
    expect(
      validateCreateTradingAccount({
        ...valid,
        currentBalanceCents: 10,
        balanceUpdatedAt: "2026-08-10T00:00:00.000Z",
      }),
    ).toMatchObject({ currentBalanceCents: 10 });
    expect(() => validateCreateTradingAccount({ ...valid, currentBalanceCents: 10 })).toThrow(
      TradingAccountValidationError,
    );
    expect(() =>
      validateCreateTradingAccount({ ...valid, balanceUpdatedAt: "2026-08-10T00:00:00.000Z" }),
    ).toThrow(TradingAccountValidationError);
  });
  it("has an ownership-free update contract", () => {
    expect(validateUpdateTradingAccount({ accountName: " Updated ", status: " Active " })).toEqual({
      accountName: "Updated",
      status: "Active",
    });
    expect(validateUpdateTradingAccount({})).not.toHaveProperty("traderId");
    expect(validateUpdateTradingAccount({})).not.toHaveProperty("id");
  });
  it("uses stable application error codes", () => {
    for (const code of [
      "VALIDATION_ERROR",
      "UNAUTHENTICATED",
      "TRADER_PROFILE_NOT_FOUND",
      "TRADING_ACCOUNT_NOT_FOUND",
      "CONFLICT",
      "PERSISTENCE_ERROR",
    ] as const)
      expect(new TradingAccountApplicationError(code, "safe").code).toBe(code);
  });
});
