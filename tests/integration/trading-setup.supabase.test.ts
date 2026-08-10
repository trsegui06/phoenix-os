import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { CreateTradingSetupInput } from "@/domain/trading/trading-setup";
import { TradingApplicationError } from "@/services/trading/errors";
import {
  createTradingSetup,
  getTradingSetup,
  listTradingSetups,
  updateTradingSetup,
} from "@/services/trading/trading-setups";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;
const enabled = Boolean(url && key);
const input: CreateTradingSetupInput = {
  name: "Integration Setup",
  timeframe: "5m",
  marketCondition: "trending",
  entryRules: "Breakout",
  exitRules: "Target",
  validationRules: "Confirm volume",
};

const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof TradingApplicationError ? error.code : "UNKNOWN";
  }
};

describe.skipIf(!enabled)("Trading Setup local Supabase integration", () => {
  it("enforces authenticated owner-only Setup workflows and tenant-scoped uniqueness", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const password = `LocalOnly!${crypto.randomUUID()}`;
    const anon = createClient(url!, key!);
    const a = await anon.auth.signUp({ email: `setup-a-${suffix}@local.test`, password });
    const b = await anon.auth.signUp({ email: `setup-b-${suffix}@local.test`, password });
    expect(a.data.user?.id).toBeTruthy();
    expect(b.data.user?.id).toBeTruthy();

    const clientA = createClient(url!, key!, {
      global: { headers: { Authorization: `Bearer ${a.data.session!.access_token}` } },
    });
    const clientB = createClient(url!, key!, {
      global: { headers: { Authorization: `Bearer ${b.data.session!.access_token}` } },
    });
    await clientA
      .from("traders")
      .insert({ auth_user_id: a.data.user!.id, name: "A", timezone: "UTC" })
      .throwOnError();
    await clientB
      .from("traders")
      .insert({ auth_user_id: b.data.user!.id, name: "B", timezone: "UTC" })
      .throwOnError();

    const setupA = await createTradingSetup(clientA, {
      ...input,
      traderId: "ownership-injection-is-ignored",
    } as CreateTradingSetupInput);
    expect(setupA.traderId).toBeTruthy();
    expect((await listTradingSetups(clientA)).map((setup) => setup.id)).toContain(setupA.id);
    expect(await listTradingSetups(clientB)).toHaveLength(0);
    expect((await getTradingSetup(clientA, setupA.id)).id).toBe(setupA.id);
    expect(await code(getTradingSetup(clientB, setupA.id))).toBe("TRADING_SETUP_NOT_FOUND");
    expect(
      (await updateTradingSetup(clientA, setupA.id, { entryRules: "Updated entry" })).entryRules,
    ).toBe("Updated entry");
    expect(await code(updateTradingSetup(clientB, setupA.id, { entryRules: "Blocked" }))).toBe(
      "TRADING_SETUP_NOT_FOUND",
    );
    expect(await code(createTradingSetup(clientA, input))).toBe("CONFLICT");
    expect((await createTradingSetup(clientB, input)).name).toBe(input.name);
    expect((await listTradingSetups(clientB)).map((setup) => setup.id)).not.toContain(setupA.id);

    const unsigned = createClient(url!, key!, { auth: { persistSession: false } });
    expect(await code(createTradingSetup(unsigned, input))).toBe("UNAUTHENTICATED");
    expect(await code(listTradingSetups(unsigned))).toBe("UNAUTHENTICATED");
    expect(await code(getTradingSetup(unsigned, setupA.id))).toBe("UNAUTHENTICATED");
    expect(await code(updateTradingSetup(unsigned, setupA.id, { name: "Blocked" }))).toBe(
      "UNAUTHENTICATED",
    );
  });
});
