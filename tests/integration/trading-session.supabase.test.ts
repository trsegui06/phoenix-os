import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { CreateTradingSessionInput } from "@/domain/trading/trading-session";
import { TradingApplicationError } from "@/services/trading/errors";
import {
  createTradingSession,
  getTradingSession,
  listTradingSessions,
  updateTradingSession,
} from "@/services/trading/trading-sessions";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;
const enabled = Boolean(url && key);
const input: CreateTradingSessionInput = {
  sessionDate: "2026-08-10",
  sessionType: "regular",
  marketBias: "neutral",
  emotionalState: "calm",
  notes: "Session A",
};

const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof TradingApplicationError ? error.code : "UNKNOWN";
  }
};

describe.skipIf(!enabled)("Trading Session local Supabase integration", () => {
  it("enforces authenticated owner-only Session workflows", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const password = `LocalOnly!${crypto.randomUUID()}`;
    const anon = createClient(url!, key!);
    const a = await anon.auth.signUp({ email: `session-a-${suffix}@local.test`, password });
    const b = await anon.auth.signUp({ email: `session-b-${suffix}@local.test`, password });
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

    const sessionA = await createTradingSession(clientA, input);
    expect(sessionA.traderId).toBeTruthy();
    expect((await listTradingSessions(clientA)).map((session) => session.id)).toContain(
      sessionA.id,
    );
    expect(await listTradingSessions(clientB)).toHaveLength(0);
    expect((await getTradingSession(clientA, sessionA.id)).id).toBe(sessionA.id);
    expect(await code(getTradingSession(clientB, sessionA.id))).toBe("TRADING_SESSION_NOT_FOUND");
    expect((await updateTradingSession(clientA, sessionA.id, { notes: "Updated" })).notes).toBe(
      "Updated",
    );
    expect(await code(updateTradingSession(clientB, sessionA.id, { notes: "Blocked" }))).toBe(
      "TRADING_SESSION_NOT_FOUND",
    );
    expect(
      await code(createTradingSession(clientA, { ...input, sessionDate: "2026-08-10T00:00:00Z" })),
    ).toBe("VALIDATION_ERROR");
    expect(
      (await createTradingSession(clientA, { ...input, sessionType: "second" })).sessionDate,
    ).toBe("2026-08-10");
    expect(
      await code(
        listTradingSessions(createClient(url!, key!, { auth: { persistSession: false } })),
      ),
    ).toBe("UNAUTHENTICATED");
  });
});
