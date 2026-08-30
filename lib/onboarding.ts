export type OnboardingStep = "welcome" | "account" | "environment" | "complete";

export type OnboardingInventory = {
  hasTrader: boolean;
  accountCount: number;
  sessionCount: number;
  setupCount: number;
};

export function deriveOnboardingStep(inventory: OnboardingInventory): OnboardingStep {
  if (!inventory.hasTrader) return "welcome";
  if (inventory.accountCount === 0) return "account";
  if (inventory.sessionCount === 0 || inventory.setupCount === 0) return "environment";
  return "complete";
}

export function resolveOnboardingStep(
  inventory: OnboardingInventory,
  requestedStep?: string,
): OnboardingStep {
  const canonical = deriveOnboardingStep(inventory);
  if (!inventory.hasTrader || canonical === "complete") return canonical;
  if (requestedStep === "environment") return "environment";
  if (requestedStep === "complete") return "complete";
  return canonical;
}
