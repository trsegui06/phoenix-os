import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";
import {
  analyzeTradeImport,
  executeTradeImport,
  previewTradeImport,
} from "@/services/trading/trade-import";
import { getTradingOverview } from "@/services/trading/trading-statistics";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;
const enabled = Boolean(url && key);
const fixture = new Uint8Array(
  readFileSync(fileURLToPath(new URL("../fixtures/raiseglobal-sanitized.csv", import.meta.url))),
);

describe.skipIf(!enabled)("Historical Trade import local Supabase integration", () => {
  it("imports unknown-risk Trades atomically, enforces provenance uniqueness, ownership, and statistics semantics", async () => {
    const anon = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const suffix = randomUUID();
    const [signedA, signedB] = await Promise.all([
      anon.auth.signUp({ email: `import-a-${suffix}@local.test`, password: "Phoenix-test-123!" }),
      anon.auth.signUp({ email: `import-b-${suffix}@local.test`, password: "Phoenix-test-123!" }),
    ]);
    const client = (token: string) =>
      createClient<Database>(url!, key!, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
    const a = client(signedA.data.session!.access_token);
    const b = client(signedB.data.session!.access_token);
    const ids = {
      traderA: randomUUID(),
      traderB: randomUUID(),
      accountA: randomUUID(),
      accountB: randomUUID(),
      setupA: randomUUID(),
      setupB: randomUUID(),
      session17: randomUUID(),
    };
    await a
      .from("traders")
      .insert({
        id: ids.traderA,
        auth_user_id: signedA.data.user!.id,
        name: "Import A",
        timezone: "UTC",
      })
      .throwOnError();
    await b
      .from("traders")
      .insert({
        id: ids.traderB,
        auth_user_id: signedB.data.user!.id,
        name: "Import B",
        timezone: "UTC",
      })
      .throwOnError();
    for (const [c, trader, account, setup, label] of [
      [a, ids.traderA, ids.accountA, ids.setupA, "A"],
      [b, ids.traderB, ids.accountB, ids.setupB, "B"],
    ] as const) {
      await c
        .from("trading_accounts")
        .insert({
          id: account,
          trader_id: trader,
          broker: "Broker",
          account_name: `Import ${label}`,
          account_type: "cash",
          currency: "EUR",
          initial_balance_cents: 100000,
          status: "active",
        })
        .throwOnError();
      await c
        .from("setups")
        .insert({
          id: setup,
          trader_id: trader,
          name: `Aurum ${label}`,
          timeframe: "5m",
          entry_rules: "entry",
          exit_rules: "exit",
          validation_rules: "valid",
        })
        .throwOnError();
    }
    await a
      .from("sessions")
      .insert({
        id: ids.session17,
        trader_id: ids.traderA,
        session_date: "2026-08-17",
        session_type: "regular",
      })
      .throwOnError();

    const analysis = analyzeTradeImport(fixture);
    const mapping = {
      tradingAccountId: ids.accountA,
      setupId: ids.setupA,
      asset: "XAUUSD" as const,
      historicalSessionType: "Historical import",
      selectedSessionIdsByDate: {},
    };
    const preview = await previewTradeImport(a, fixture, analysis.fileHash, mapping);
    expect(preview.rows).toHaveLength(5);
    expect(preview.sessionPlan).toMatchObject({ existing: 1, toCreate: 1, ambiguous: 0 });
    expect(preview.rows.every((row) => row.riskStatus === "unknown" && !row.duplicate)).toBe(true);

    await expect(
      previewTradeImport(a, fixture, analysis.fileHash, {
        ...mapping,
        tradingAccountId: ids.accountB,
      }),
    ).rejects.toThrow("owned Phoenix Trading Account");
    expect(await executeTradeImport(a, fixture, analysis.fileHash, mapping)).toMatchObject({
      sessions: { existingMapped: 1, created: 1 },
      trades: { imported: 5, duplicates: 0, rejected: 0, failed: 0 },
    });
    expect(await executeTradeImport(a, fixture, analysis.fileHash, mapping)).toMatchObject({
      sessions: { existingMapped: 2, created: 0 },
      trades: { imported: 0, duplicates: 5, rejected: 0, failed: 0 },
    });

    const imported = await a
      .from("trades")
      .select(
        "trade_date,session_id,risk_basis_points,import_source,external_trade_id,import_batch_id,import_metadata,pnl_cents",
      )
      .eq("trading_account_id", ids.accountA);
    expect(imported.error).toBeNull();
    expect(imported.data).toHaveLength(5);
    expect(
      imported.data!.every(
        (row) =>
          row.risk_basis_points === null &&
          row.import_source === "raiseglobal-csv-v1" &&
          row.external_trade_id &&
          row.import_batch_id,
      ),
    ).toBe(true);
    const createdSession = await a
      .from("sessions")
      .select("id,creation_source,creation_import_batch_id")
      .eq("trader_id", ids.traderA)
      .eq("session_date", "2026-08-18")
      .single();
    expect(createdSession.error).toBeNull();
    expect(createdSession.data).toMatchObject({ creation_source: "historical_import" });
    expect(createdSession.data!.creation_import_batch_id).toBeTruthy();
    expect(
      imported
        .data!.filter((row) => row.trade_date === "2026-08-18")
        .every((row) => row.session_id === createdSession.data!.id),
    ).toBe(true);
    expect(
      (await b.from("trades").select("id").in("external_trade_id", ["SAN-1001", "SAN-1002"])).data,
    ).toHaveLength(0);

    const overview = await getTradingOverview(a);
    expect(overview).toMatchObject({
      totalTradeCount: 5,
      closedTradeCount: 5,
      winCount: 2,
      lossCount: 2,
      breakevenCount: 1,
      averageRiskBasisPoints: null,
    });
    expect(overview.realizedPnlByCurrency).toEqual([
      {
        currency: "EUR",
        realizedPnlCents: "450",
        averagePnlCents: "90.0000000000000000",
        grossProfitCents: "3050",
        grossLossCents: "-2600",
      },
    ]);

    const databaseDuplicate = await a.rpc("create_trade_with_errors", {
      target_trading_account_id: ids.accountA,
      target_session_id: ids.session17,
      target_setup_id: ids.setupA,
      target_trade_date: "2026-08-17",
      target_asset: "XAUUSD",
      target_direction: "long",
      target_entry_price: 2400,
      target_stop_loss: 2390,
      target_take_profit: 2410,
      target_risk_basis_points: null as never,
      target_position_size: 0.01,
      target_result: "win",
      target_import_source: "raiseglobal-csv-v1",
      target_external_account_id: "DEMO-ACCOUNT",
      target_external_trade_id: "SAN-1001",
      target_import_batch_id: randomUUID(),
      target_import_metadata: {},
    });
    expect(databaseDuplicate.error?.code).toBe("23505");

    const withoutProvenance = await a.rpc("create_trade_with_errors", {
      target_trading_account_id: ids.accountA,
      target_session_id: ids.session17,
      target_setup_id: ids.setupA,
      target_trade_date: "2026-08-17",
      target_asset: "XAUUSD",
      target_direction: "long",
      target_entry_price: 2400,
      target_stop_loss: 2390,
      target_take_profit: 2410,
      target_risk_basis_points: null as never,
      target_position_size: 0.01,
      target_result: "win",
    });
    expect(withoutProvenance.error).toBeTruthy();
    expect((await a.from("trades").select("id")).data).toHaveLength(5);

    const manual = await a.rpc("create_trade_with_errors", {
      target_trading_account_id: ids.accountA,
      target_session_id: ids.session17,
      target_setup_id: ids.setupA,
      target_trade_date: "2026-08-17",
      target_asset: "EURUSD",
      target_direction: "long",
      target_entry_price: 1.1,
      target_stop_loss: 1,
      target_take_profit: 1.2,
      target_risk_basis_points: 250,
      target_position_size: 1,
      target_result: "win",
      target_pnl_cents: 50,
    });
    expect(manual.error).toBeNull();
    const mixedOverview = await getTradingOverview(a);
    expect(mixedOverview).toMatchObject({
      totalTradeCount: 6,
      averageRiskBasisPoints: "250.0000000000000000",
    });
    expect(mixedOverview.realizedPnlByCurrency[0]?.realizedPnlCents).toBe("500");
  });
});
