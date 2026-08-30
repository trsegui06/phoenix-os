import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { deriveOnboardingStep } from "@/lib/onboarding";
import { provisionCurrentTrader } from "@/services/trading/trader-provisioning";
import { createTradingAccount, listTradingAccounts } from "@/services/trading/trading-accounts";
import { createTradingSession, listTradingSessions } from "@/services/trading/trading-sessions";
import { createTradingSetup, listTradingSetups } from "@/services/trading/trading-setups";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;

describe.skipIf(!(url && key))("Onboarding flow local Supabase integration", () => {
  it("persists owned prerequisites and resumes from authoritative database state", async () => {
    const client = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const signup = await client.auth.signUp({
      email: `onboarding-flow-${Date.now()}-${Math.random()}@example.test`,
      password: "Phoenix-onboarding-123!",
    });
    expect(signup.error).toBeNull();

    const inventory = async () => {
      const [accounts, sessions, setups] = await Promise.all([
        listTradingAccounts(client),
        listTradingSessions(client),
        listTradingSetups(client),
      ]);
      return {
        hasTrader: true,
        accountCount: accounts.length,
        sessionCount: sessions.length,
        setupCount: setups.length,
      };
    };

    await provisionCurrentTrader(client, { name: "Onboarding Flow", timezone: "UTC" });
    expect(deriveOnboardingStep(await inventory())).toBe("account");
    await createTradingAccount(client, {
      broker: "Phoenix Broker",
      accountName: "First Account",
      accountType: "cash",
      currency: "EUR",
      initialBalanceCents: 100_000,
      status: "active",
    });
    expect(deriveOnboardingStep(await inventory())).toBe("environment");
    await createTradingSession(client, { sessionDate: "2026-08-30", sessionType: "London" });
    expect(deriveOnboardingStep(await inventory())).toBe("environment");
    await createTradingSetup(client, {
      name: "Breakout",
      timeframe: "15m",
      entryRules: "Wait for structure.",
      exitRules: "Use planned target.",
      validationRules: "Confirm context.",
    });
    expect(deriveOnboardingStep(await inventory())).toBe("complete");
    await expect(
      provisionCurrentTrader(client, { name: "Duplicate", timezone: "UTC" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
