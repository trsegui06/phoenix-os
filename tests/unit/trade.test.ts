import { describe, expect, it } from "vitest";
import {
  TradeValidationError,
  validateCreateTrade,
  validateUpdateTrade,
} from "@/domain/trading/trade";
import { TradingApplicationError } from "@/services/trading/errors";

const ids = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  setupId: "22222222-2222-4222-8222-222222222222",
  tradingAccountId: "33333333-3333-4333-8333-333333333333",
};
const valid = {
  ...ids,
  tradeDate: "2026-08-10",
  asset: " ES ",
  direction: "LONG" as unknown as "long",
  entryPrice: 100,
  stopLoss: 99,
  takeProfit: 102,
  exitPrice: 101,
  riskBasisPoints: 100,
  positionSize: 1,
  result: " Planned ",
  pnlCents: -100,
  executionQuality: " Good ",
  screenshots: [" screenshot-1 "],
  notes: " Note ",
};

describe("Trade validation", () => {
  it("normalizes valid source input", () => {
    expect(validateCreateTrade(valid)).toMatchObject({
      asset: "ES",
      direction: "long",
      result: "Planned",
      executionQuality: "Good",
      screenshots: ["screenshot-1"],
      notes: "Note",
    });
  });

  it.each(["bad", "11111111-1111-4111-8111-11111111111z"])(
    "rejects malformed parent UUID %s",
    (sessionId) => {
      expect(() => validateCreateTrade({ ...valid, sessionId })).toThrow(TradeValidationError);
    },
  );

  it.each(["2026-8-10", "2026-02-30", "2026-08-10T00:00:00Z"])(
    "rejects invalid trade date %s",
    (tradeDate) => {
      expect(() => validateCreateTrade({ ...valid, tradeDate })).toThrow(TradeValidationError);
    },
  );

  it.each([
    ["asset", { ...valid, asset: " " }],
    ["result", { ...valid, result: " " }],
    ["direction", { ...valid, direction: "sideways" }],
  ])("rejects invalid %s", (_field, input) => {
    expect(() => validateCreateTrade(input as typeof valid)).toThrow(TradeValidationError);
  });

  it.each([
    ["entryPrice", 0],
    ["entryPrice", -1],
    ["entryPrice", Number.NaN],
    ["entryPrice", Infinity],
    ["stopLoss", -1],
    ["takeProfit", -1],
    ["exitPrice", -1],
  ])("rejects invalid price %s=%s", (field, value) => {
    expect(() => validateCreateTrade({ ...valid, [field]: value })).toThrow(TradeValidationError);
  });

  it.each([-1, 10_001, 1.5])("rejects invalid risk basis points %s", (riskBasisPoints) => {
    expect(() => validateCreateTrade({ ...valid, riskBasisPoints })).toThrow(TradeValidationError);
  });

  it("accepts risk boundaries and signed integer PnL cents", () => {
    expect(validateCreateTrade({ ...valid, riskBasisPoints: 0, pnlCents: 0 }).pnlCents).toBe(0);
    expect(validateCreateTrade({ ...valid, riskBasisPoints: 10_000, pnlCents: 1 }).pnlCents).toBe(
      1,
    );
    expect(validateCreateTrade({ ...valid, pnlCents: -1 }).pnlCents).toBe(-1);
    expect(() => validateCreateTrade({ ...valid, pnlCents: 1.5 })).toThrow(TradeValidationError);
  });

  it.each([0, -1, Number.POSITIVE_INFINITY])("rejects invalid position size %s", (positionSize) => {
    expect(() => validateCreateTrade({ ...valid, positionSize })).toThrow(TradeValidationError);
  });

  it("validates screenshot references and optional text", () => {
    expect(
      validateUpdateTrade({ screenshots: [" image "], notes: " ", executionQuality: " " }),
    ).toEqual({
      screenshots: ["image"],
      notes: null,
      executionQuality: null,
    });
    expect(() => validateUpdateTrade({ screenshots: [""] })).toThrow(TradeValidationError);
  });

  it("keeps ownership outside input contracts and exposes stable not-found errors", () => {
    expect(validateUpdateTrade({})).not.toHaveProperty("traderId");
    expect(new TradingApplicationError("TRADING_TRADE_NOT_FOUND", "not found").code).toBe(
      "TRADING_TRADE_NOT_FOUND",
    );
  });
});
