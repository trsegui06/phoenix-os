import { describe, expect, it } from "vitest";
import {
  adaptCreateAccountForm,
  adaptUpdateAccountForm,
  formatAccountMoney,
  parseAccountMoney,
  TradingSettingsFormError,
} from "@/lib/trading-settings";

const form = (values: Record<string, string>) => {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
};

describe("Trading settings form adapters", () => {
  it.each([
    ["0", 0],
    ["125.50", 12550],
    ["90071992547409.91", 9007199254740991],
  ])("converts Account money %s exactly", (value, cents) =>
    expect(parseAccountMoney(value)).toBe(cents),
  );
  it.each(["-1", "1.234", "NaN", "90071992547409.92"])("rejects unsafe Account money %s", (value) =>
    expect(() => parseAccountMoney(value)).toThrow(TradingSettingsFormError),
  );
  it("formats cents without floating arithmetic", () =>
    expect(formatAccountMoney(12550)).toBe("125.50"));
  it("creates an Account without a Prop Firm and normalizes currency", () =>
    expect(
      adaptCreateAccountForm(
        form({
          accountName: "Primary",
          broker: "Broker",
          accountType: "cash",
          currency: "eur",
          initialBalance: "1000.00",
          status: "active",
        }),
      ),
    ).toEqual({
      propFirmId: null,
      accountName: "Primary",
      broker: "Broker",
      accountType: "cash",
      currency: "EUR",
      initialBalanceCents: 100000,
      currentBalanceCents: null,
      balanceUpdatedAt: null,
      status: "active",
    }));
  it("keeps currency and initial balance out of the update adapter", () =>
    expect(
      adaptUpdateAccountForm(
        form({
          accountName: "Primary",
          broker: "Broker",
          accountType: "cash",
          status: "active",
          currency: "USD",
          initialBalance: "1",
          currentBalance: "",
          balanceUpdatedAt: "",
        }),
      ),
    ).toEqual({
      accountName: "Primary",
      broker: "Broker",
      accountType: "cash",
      status: "active",
      currentBalanceCents: null,
      balanceUpdatedAt: null,
    }));
  it("requires current balance and timestamp together", () =>
    expect(() =>
      adaptUpdateAccountForm(
        form({
          accountName: "Primary",
          broker: "Broker",
          accountType: "cash",
          status: "active",
          currentBalance: "12.00",
          balanceUpdatedAt: "",
        }),
      ),
    ).toThrow(TradingSettingsFormError));
});
