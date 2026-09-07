import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;
const enabled = Boolean(url && key);

describe.skipIf(!enabled)("Historical Session resolver local Supabase integration", () => {
  it("enforces auth, ownership, ambiguity, provenance, concurrency and idempotency", async () => {
    const anon = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const suffix = randomUUID();
    const password = "Phoenix-session-123!";
    const [signedA, signedB] = await Promise.all([
      anon.auth.signUp({ email: `historical-session-a-${suffix}@local.test`, password }),
      anon.auth.signUp({ email: `historical-session-b-${suffix}@local.test`, password }),
    ]);
    const client = (token: string) =>
      createClient<Database>(url!, key!, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
    const a = client(signedA.data.session!.access_token);
    const b = client(signedB.data.session!.access_token);
    const traderA = randomUUID();
    const traderB = randomUUID();
    await a
      .from("traders")
      .insert({ id: traderA, auth_user_id: signedA.data.user!.id, name: "A", timezone: "UTC" })
      .throwOnError();
    await b
      .from("traders")
      .insert({ id: traderB, auth_user_id: signedB.data.user!.id, name: "B", timezone: "UTC" })
      .throwOnError();

    const manualA = randomUUID();
    const manualB = randomUUID();
    const otherTraderSession = randomUUID();
    await a
      .from("sessions")
      .insert([
        { id: manualA, trader_id: traderA, session_date: "2026-08-17", session_type: "London" },
        {
          id: manualB,
          trader_id: traderA,
          session_date: "2026-08-17",
          session_type: "New York",
        },
      ])
      .throwOnError();
    await b
      .from("sessions")
      .insert({
        id: otherTraderSession,
        trader_id: traderB,
        session_date: "2026-08-17",
        session_type: "Other trader",
      })
      .throwOnError();

    const unauthenticated = createClient<Database>(url!, key!, {
      auth: { persistSession: false },
    });
    expect(
      (
        await unauthenticated.rpc("resolve_historical_import_sessions", {
          target_dates: ["2026-08-18"],
          target_session_type: "Historical import",
          target_import_batch_id: randomUUID(),
        })
      ).error,
    ).toBeTruthy();

    const ambiguous = await a.rpc("resolve_historical_import_sessions", {
      target_dates: ["2026-08-17", "2026-08-18"],
      target_session_type: "Historical import",
      target_import_batch_id: randomUUID(),
    });
    expect(ambiguous.error).toBeTruthy();
    expect(
      (
        await a
          .from("sessions")
          .select("id")
          .eq("session_date", "2026-08-18")
          .eq("creation_source", "historical_import")
      ).data,
    ).toHaveLength(0);

    const wrongTrader = await a.rpc("resolve_historical_import_sessions", {
      target_dates: ["2026-08-17"],
      target_session_type: "Historical import",
      target_import_batch_id: randomUUID(),
      target_selected_session_ids: { "2026-08-17": otherTraderSession },
    });
    expect(wrongTrader.error).toBeTruthy();

    const selected = await a.rpc("resolve_historical_import_sessions", {
      target_dates: ["2026-08-17"],
      target_session_type: "Historical import",
      target_import_batch_id: randomUUID(),
      target_selected_session_ids: { "2026-08-17": manualA },
    });
    expect(selected.error).toBeNull();
    expect(selected.data).toEqual([
      expect.objectContaining({
        trade_date: "2026-08-17",
        session_id: manualA,
        session_type: "London",
        resolution_status: "existing",
      }),
    ]);

    const wrongDate = await a.rpc("resolve_historical_import_sessions", {
      target_dates: ["2026-08-19"],
      target_session_type: "Historical import",
      target_import_batch_id: randomUUID(),
      target_selected_session_ids: { "2026-08-19": manualA },
    });
    expect(wrongDate.error).toBeTruthy();

    const batchA = randomUUID();
    const batchB = randomUUID();
    const [raceA, raceB] = await Promise.all([
      a.rpc("resolve_historical_import_sessions", {
        target_dates: ["2026-08-20"],
        target_session_type: "Historical import",
        target_import_batch_id: batchA,
      }),
      a.rpc("resolve_historical_import_sessions", {
        target_dates: ["2026-08-20"],
        target_session_type: "Historical import",
        target_import_batch_id: batchB,
      }),
    ]);
    expect(raceA.error).toBeNull();
    expect(raceB.error).toBeNull();
    expect(raceA.data![0]!.session_id).toBe(raceB.data![0]!.session_id);
    const historical = await a
      .from("sessions")
      .select("id,creation_source,creation_import_batch_id,market_bias,emotional_state,notes")
      .eq("session_date", "2026-08-20")
      .eq("creation_source", "historical_import");
    expect(historical.error).toBeNull();
    expect(historical.data).toHaveLength(1);
    expect(historical.data![0]).toMatchObject({
      creation_source: "historical_import",
      market_bias: null,
      emotional_state: null,
      notes: null,
    });
    expect(historical.data![0]!.creation_import_batch_id).toBeTruthy();

    const retry = await a.rpc("resolve_historical_import_sessions", {
      target_dates: ["2026-08-20"],
      target_session_type: "Edited historical type",
      target_import_batch_id: randomUUID(),
    });
    expect(retry.error).toBeNull();
    expect(retry.data![0]).toMatchObject({
      session_id: historical.data![0]!.id,
      session_type: "Historical import",
      resolution_status: "existing",
    });

    const invalidManualProvenance = await a.from("sessions").insert({
      trader_id: traderA,
      session_date: "2026-08-21",
      session_type: "regular",
      creation_source: "manual",
      creation_import_batch_id: randomUUID(),
    });
    expect(invalidManualProvenance.error?.code).toBe("23514");
    const invalidHistoricalProvenance = await a.from("sessions").insert({
      trader_id: traderA,
      session_date: "2026-08-21",
      session_type: "Historical import",
      creation_source: "historical_import",
    });
    expect(invalidHistoricalProvenance.error?.code).toBe("23514");

    const manualSameDate = await a.from("sessions").insert([
      { trader_id: traderA, session_date: "2026-08-22", session_type: "London" },
      { trader_id: traderA, session_date: "2026-08-22", session_type: "New York" },
    ]);
    expect(manualSameDate.error).toBeNull();
    expect(
      (await b.from("sessions").select("id").eq("id", historical.data![0]!.id)).data,
    ).toHaveLength(0);
  });
});
