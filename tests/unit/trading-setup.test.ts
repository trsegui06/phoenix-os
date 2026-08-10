import { describe, expect, it } from "vitest";
import {
  TradingSetupValidationError,
  validateCreateTradingSetup,
  validateUpdateTradingSetup,
} from "@/domain/trading/trading-setup";
import { TradingApplicationError } from "@/services/trading/errors";

const valid = {
  name: " Opening Range ",
  timeframe: " 5m ",
  marketCondition: " Trending ",
  entryRules: " Breakout ",
  exitRules: " Target ",
  validationRules: " Confirm volume ",
};

describe("Trading Setup validation", () => {
  it("normalizes valid create input", () => {
    expect(validateCreateTradingSetup(valid)).toEqual({
      name: "Opening Range",
      timeframe: "5m",
      marketCondition: "Trending",
      entryRules: "Breakout",
      exitRules: "Target",
      validationRules: "Confirm volume",
    });
  });

  it.each([
    ["name", { ...valid, name: " " }],
    ["timeframe", { ...valid, timeframe: " " }],
    ["entryRules", { ...valid, entryRules: " " }],
    ["exitRules", { ...valid, exitRules: " " }],
    ["validationRules", { ...valid, validationRules: " " }],
  ])("rejects an empty %s", (_field, input) => {
    expect(() => validateCreateTradingSetup(input)).toThrow(TradingSetupValidationError);
  });

  it("normalizes an empty optional market condition to null", () => {
    expect(validateUpdateTradingSetup({ marketCondition: " " })).toEqual({ marketCondition: null });
  });

  it("keeps ownership outside update contracts", () => {
    expect(validateUpdateTradingSetup({ name: " Updated " })).toEqual({ name: "Updated" });
    expect(validateUpdateTradingSetup({})).not.toHaveProperty("traderId");
  });

  it("uses stable not-found and conflict error codes", () => {
    expect(new TradingApplicationError("TRADING_SETUP_NOT_FOUND", "not found").code).toBe(
      "TRADING_SETUP_NOT_FOUND",
    );
    expect(new TradingApplicationError("CONFLICT", "duplicate").code).toBe("CONFLICT");
  });
});
