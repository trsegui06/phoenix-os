import { describe, expect, it } from "vitest";
import { deriveOnboardingStep, resolveOnboardingStep } from "@/lib/onboarding";

describe("onboarding state derivation", () => {
  it.each([
    [{ hasTrader: false, accountCount: 0, sessionCount: 0, setupCount: 0 }, "welcome"],
    [{ hasTrader: true, accountCount: 0, sessionCount: 0, setupCount: 0 }, "account"],
    [{ hasTrader: true, accountCount: 1, sessionCount: 0, setupCount: 0 }, "environment"],
    [{ hasTrader: true, accountCount: 1, sessionCount: 1, setupCount: 1 }, "complete"],
  ] as const)("derives %s as %s", (inventory, step) => {
    expect(deriveOnboardingStep(inventory)).toBe(step);
  });

  it("allows explicit skip progression without overriding authentication or completed data", () => {
    const traderOnly = { hasTrader: true, accountCount: 0, sessionCount: 0, setupCount: 0 };
    expect(resolveOnboardingStep(traderOnly, "environment")).toBe("environment");
    expect(resolveOnboardingStep(traderOnly, "complete")).toBe("complete");
    expect(resolveOnboardingStep({ ...traderOnly, hasTrader: false }, "complete")).toBe("welcome");
    expect(
      resolveOnboardingStep(
        { ...traderOnly, accountCount: 1, sessionCount: 1, setupCount: 1 },
        "environment",
      ),
    ).toBe("complete");
  });
});
