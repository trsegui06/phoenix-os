import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { TradingApplicationError } from "@/services/trading/errors";
import {
  createTradingObjective,
  getTradingObjective,
  listTradingObjectives,
  updateTradingObjective,
} from "@/services/trading/trading-objectives";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;
const enabled = Boolean(url && key);
const input = {
  title: "Integration objective",
  description: "Source data only",
  category: "trading",
  targetDate: "2026-12-31",
  status: "active",
};

const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof TradingApplicationError ? error.code : "UNKNOWN";
  }
};

describe.skipIf(!enabled)("Trading Objective local Supabase integration", () => {
  it("enforces authenticated owner-only Objective workflows", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const password = `LocalOnly!${crypto.randomUUID()}`;
    const anon = createClient(url!, key!);
    const a = await anon.auth.signUp({ email: `objective-a-${suffix}@local.test`, password });
    const b = await anon.auth.signUp({ email: `objective-b-${suffix}@local.test`, password });
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
    const traderB = await clientB
      .from("traders")
      .insert({ auth_user_id: b.data.user!.id, name: "B", timezone: "UTC" })
      .select("id")
      .single()
      .throwOnError();

    const objectiveA = await createTradingObjective(clientA, {
      ...input,
      traderId: traderB.data.id,
    } as typeof input);
    expect(objectiveA.traderId).not.toBe(traderB.data.id);
    expect((await listTradingObjectives(clientA)).map((objective) => objective.id)).toContain(
      objectiveA.id,
    );
    expect(await listTradingObjectives(clientB)).toHaveLength(0);
    expect((await getTradingObjective(clientA, objectiveA.id)).id).toBe(objectiveA.id);
    expect(await code(getTradingObjective(clientB, objectiveA.id))).toBe(
      "TRADING_OBJECTIVE_NOT_FOUND",
    );
    expect(
      await updateTradingObjective(clientA, objectiveA.id, {
        description: "Updated",
        status: "completed",
        targetDate: null,
      }),
    ).toMatchObject({ description: "Updated", status: "completed", targetDate: null });
    expect(await code(updateTradingObjective(clientB, objectiveA.id, { status: "blocked" }))).toBe(
      "TRADING_OBJECTIVE_NOT_FOUND",
    );

    const unsigned = createClient(url!, key!, { auth: { persistSession: false } });
    expect(await code(createTradingObjective(unsigned, input))).toBe("UNAUTHENTICATED");
    expect(await code(listTradingObjectives(unsigned))).toBe("UNAUTHENTICATED");
    expect(await code(getTradingObjective(unsigned, objectiveA.id))).toBe("UNAUTHENTICATED");
    expect(await code(updateTradingObjective(unsigned, objectiveA.id, { status: "blocked" }))).toBe(
      "UNAUTHENTICATED",
    );
  });
});
