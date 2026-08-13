import { describe, expect, it } from "vitest";
import {
  TradingObjectiveValidationError,
  validateCreateTradingObjective,
  validateUpdateTradingObjective,
} from "@/domain/trading/trading-objective";
import { TradingApplicationError } from "@/services/trading/errors";

const valid = {
  title: " Build consistency ",
  description: " Keep the process ",
  category: " Trading ",
  targetDate: "2026-12-31",
  status: " Active ",
};

describe("Trading Objective validation", () => {
  it("normalizes valid create input", () => {
    expect(validateCreateTradingObjective(valid)).toEqual({
      title: "Build consistency",
      description: "Keep the process",
      category: "Trading",
      targetDate: "2026-12-31",
      status: "Active",
    });
  });

  it("rejects an empty title or status", () => {
    expect(() => validateCreateTradingObjective({ ...valid, title: " " })).toThrow(
      TradingObjectiveValidationError,
    );
    expect(() => validateCreateTradingObjective({ ...valid, status: " " })).toThrow(
      TradingObjectiveValidationError,
    );
  });

  it.each(["2026-2-1", "2026-02-30", "2026-12-31T00:00:00Z"])(
    "rejects invalid target date %s",
    (targetDate) => {
      expect(() => validateCreateTradingObjective({ ...valid, targetDate })).toThrow(
        TradingObjectiveValidationError,
      );
    },
  );

  it("preserves nullable optional fields", () => {
    expect(
      validateUpdateTradingObjective({ description: " ", category: " ", targetDate: null }),
    ).toEqual({ description: null, category: null, targetDate: null });
  });

  it("keeps ownership out of update contracts and exposes a stable not-found error", () => {
    expect(validateUpdateTradingObjective({})).not.toHaveProperty("traderId");
    expect(new TradingApplicationError("TRADING_OBJECTIVE_NOT_FOUND", "not found").code).toBe(
      "TRADING_OBJECTIVE_NOT_FOUND",
    );
  });
});
