import { describe, expect, it } from "vitest";
import {
  TradeErrorValidationError,
  validateCreateTradeError,
  validateUpdateTradeError,
} from "@/domain/trading/trade-error";
import { TradingApplicationError } from "@/services/trading/errors";

const valid = {
  tradeId: "11111111-1111-4111-8111-111111111111",
  category: " Execution ",
  severity: " High ",
  description: " Entered too early ",
  solution: " Wait for confirmation ",
};

describe("Trade Error validation", () => {
  it("normalizes a valid create input", () => {
    expect(validateCreateTradeError(valid)).toEqual({
      tradeId: valid.tradeId,
      category: "Execution",
      severity: "High",
      description: "Entered too early",
      solution: "Wait for confirmation",
    });
  });

  it("rejects malformed Trade IDs", () => {
    expect(() => validateCreateTradeError({ ...valid, tradeId: "not-a-uuid" })).toThrow(
      TradeErrorValidationError,
    );
  });

  it.each([
    ["category", { ...valid, category: " " }],
    ["severity", { ...valid, severity: " " }],
    ["description", { ...valid, description: " " }],
  ])("rejects an empty required %s", (_field, input) => {
    expect(() => validateCreateTradeError(input)).toThrow(TradeErrorValidationError);
  });

  it("normalizes an empty optional solution", () => {
    expect(validateUpdateTradeError({ solution: " " })).toEqual({ solution: null });
  });

  it("validates update fields without allowing ownership or Trade reassignment", () => {
    expect(validateUpdateTradeError({ category: " Process ", severity: " Low " })).toEqual({
      category: "Process",
      severity: "Low",
    });
    expect(validateUpdateTradeError({})).not.toHaveProperty("traderId");
    expect(validateUpdateTradeError({})).not.toHaveProperty("tradeId");
  });

  it("uses the stable Trade Error not-found error", () => {
    expect(new TradingApplicationError("TRADING_TRADE_ERROR_NOT_FOUND", "not found").code).toBe(
      "TRADING_TRADE_ERROR_NOT_FOUND",
    );
  });
});
