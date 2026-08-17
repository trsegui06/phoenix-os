import { describe, expect, it } from "vitest";
import { TraderValidationError, validateCreateTrader } from "@/domain/trading/trader";

describe("Trader onboarding validation", () => {
  it("normalizes a valid identity", () => {
    expect(validateCreateTrader({ name: "  Ada  ", timezone: " Europe/Paris " })).toEqual({
      name: "Ada",
      timezone: "Europe/Paris",
    });
  });

  it.each([
    [{ name: "", timezone: "UTC" }, "name"],
    [{ name: "Ada", timezone: "not-a-timezone" }, "timezone"],
  ] as const)("rejects invalid input", (input, field) => {
    try {
      validateCreateTrader(input);
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(TraderValidationError);
      expect((error as TraderValidationError).field).toBe(field);
    }
  });
});
