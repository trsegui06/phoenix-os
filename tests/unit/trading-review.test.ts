import { describe, expect, it } from "vitest";
import {
  TradingReviewValidationError,
  validateCreateTradingReview,
  validateUpdateTradingReview,
} from "@/domain/trading/trading-review";
import { TradingApplicationError } from "@/services/trading/errors";
const id = "11111111-1111-4111-8111-111111111111";
const valid = {
  reviewType: " Weekly ",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-07",
  summary: " Summary ",
  tradeIds: [id, id],
  objectiveIds: [id],
};
describe("Trading Review validation", () => {
  it("normalizes valid input and removes duplicate links", () =>
    expect(validateCreateTradingReview(valid)).toMatchObject({
      reviewType: "Weekly",
      summary: "Summary",
      tradeIds: [id],
    }));
  it.each(["2026-8-01", "2026-02-30", "2026-08-01T00:00:00Z"])(
    "rejects invalid dates",
    (periodStart) =>
      expect(() => validateCreateTradingReview({ ...valid, periodStart })).toThrow(
        TradingReviewValidationError,
      ),
  );
  it("rejects empty type and reversed periods", () => {
    expect(() => validateCreateTradingReview({ ...valid, reviewType: " " })).toThrow(
      TradingReviewValidationError,
    );
    expect(() => validateCreateTradingReview({ ...valid, periodEnd: "2026-07-31" })).toThrow(
      TradingReviewValidationError,
    );
  });
  it("validates relationship IDs and optional text", () => {
    expect(() => validateCreateTradingReview({ ...valid, tradeIds: ["bad"] })).toThrow(
      TradingReviewValidationError,
    );
    expect(() => validateCreateTradingReview({ ...valid, objectiveIds: ["bad"] })).toThrow(
      TradingReviewValidationError,
    );
    expect(validateUpdateTradingReview({ summary: " ", tradeIds: [id, id] })).toEqual({
      summary: null,
      tradeIds: [id],
    });
  });
  it("has ownership-free contracts and a stable not-found error", () => {
    expect(validateUpdateTradingReview({})).not.toHaveProperty("traderId");
    expect(new TradingApplicationError("TRADING_REVIEW_NOT_FOUND", "x").code).toBe(
      "TRADING_REVIEW_NOT_FOUND",
    );
  });
});
