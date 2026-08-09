import { describe, expect, it } from "vitest";

import {
  isIsoCurrencyCode,
  isRiskBasisPoints,
  isValidReviewPeriod,
  MAX_RISK_BASIS_POINTS,
} from "@/domain/trading/invariants";

describe("Trading Core invariants", () => {
  it("accepts only whole risk values from 0 to 10,000 basis points", () => {
    expect(isRiskBasisPoints(0)).toBe(true);
    expect(isRiskBasisPoints(MAX_RISK_BASIS_POINTS)).toBe(true);
    expect(isRiskBasisPoints(-1)).toBe(false);
    expect(isRiskBasisPoints(MAX_RISK_BASIS_POINTS + 1)).toBe(false);
    expect(isRiskBasisPoints(1.5)).toBe(false);
  });

  it("requires a review period to end on or after its start", () => {
    expect(isValidReviewPeriod(new Date("2026-08-01"), new Date("2026-08-01"))).toBe(true);
    expect(isValidReviewPeriod(new Date("2026-08-01"), new Date("2026-08-02"))).toBe(true);
    expect(isValidReviewPeriod(new Date("2026-08-02"), new Date("2026-08-01"))).toBe(false);
  });

  it("accepts uppercase ISO-4217-compatible currency codes", () => {
    expect(isIsoCurrencyCode("EUR")).toBe(true);
    expect(isIsoCurrencyCode("eur")).toBe(false);
    expect(isIsoCurrencyCode("EURO")).toBe(false);
  });
});
