import { describe, expect, it } from "vitest";
import {
  adaptTradeEntry,
  parseDecimalInput,
  parseMoneyToCents,
  parseRiskPercent,
  TradeEntryValidationError,
} from "@/lib/trading-entry";

describe("Trading Data Entry adapters", () => {
  it.each([
    ["0", 0],
    ["0.01", 1],
    ["1", 100],
    ["1.25", 125],
    ["100.00", 10000],
  ])("converts risk %s exactly", (value, expected) =>
    expect(parseRiskPercent(value)).toBe(expected),
  );
  it.each(["-1", "100.01", "1.234", "NaN", ""])("rejects invalid risk %s", (value) =>
    expect(() => parseRiskPercent(value)).toThrow(TradeEntryValidationError),
  );
  it.each([
    ["0", 0],
    ["0.01", 1],
    ["125.50", 12550],
    ["-12.34", -1234],
  ])("converts money %s exactly", (value, expected) =>
    expect(parseMoneyToCents(value)).toBe(expected),
  );
  it.each(["1.234", "NaN", "", "90071992547410.00"])("rejects invalid money %s", (value) =>
    expect(() => parseMoneyToCents(value)).toThrow(TradeEntryValidationError),
  );
  it("parses database-compatible decimals", () =>
    expect(parseDecimalInput("1.12345678", "entryPrice")).toBe(1.12345678));
  it("maps domain validation to a safe field error", () =>
    expect(() =>
      adaptTradeEntry({
        tradingAccountId: "00000000-0000-4000-8000-000000000001",
        sessionId: "00000000-0000-4000-8000-000000000002",
        setupId: "00000000-0000-4000-8000-000000000003",
        tradeDate: "2026-08-17",
        asset: "",
        direction: "long",
        entryPrice: "1",
        stopLoss: "0",
        takeProfit: "2",
        exitPrice: "",
        riskPercent: "1",
        positionSize: "1",
        result: "open",
        pnl: "",
        executionQuality: "",
        notes: "",
        errors: [],
      }),
    ).toThrowError(expect.objectContaining({ field: "asset" })));
});
