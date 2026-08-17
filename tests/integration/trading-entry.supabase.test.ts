import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { createTradeEntry } from "@/services/trading/trading-entry";
import { getTradingOverview } from "@/services/trading/trading-statistics";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;
const enabled = Boolean(url && key);

describe.skipIf(!enabled)("Trading Data Entry local Supabase integration", () => {
  it("creates atomically, rolls back invalid children, isolates tenants, and updates statistics", async () => {
    const anon = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const suffix = randomUUID();
    const [signedA, signedB] = await Promise.all([
      anon.auth.signUp({ email: `entry-a-${suffix}@local.test`, password: "Phoenix-test-123!" }),
      anon.auth.signUp({ email: `entry-b-${suffix}@local.test`, password: "Phoenix-test-123!" }),
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
      sessionA: randomUUID(),
      sessionB: randomUUID(),
      setupA: randomUUID(),
      setupB: randomUUID(),
    };
    await a
      .from("traders")
      .insert({ id: ids.traderA, auth_user_id: signedA.data.user!.id, name: "A", timezone: "UTC" })
      .throwOnError();
    await b
      .from("traders")
      .insert({ id: ids.traderB, auth_user_id: signedB.data.user!.id, name: "B", timezone: "UTC" })
      .throwOnError();
    for (const [c, trader, account, session, setup, label] of [
      [a, ids.traderA, ids.accountA, ids.sessionA, ids.setupA, "A"],
      [b, ids.traderB, ids.accountB, ids.sessionB, ids.setupB, "B"],
    ] as const) {
      await c
        .from("trading_accounts")
        .insert({
          id: account,
          trader_id: trader,
          broker: "Broker",
          account_name: label,
          account_type: "cash",
          currency: "EUR",
          initial_balance_cents: 100000,
          status: "active",
        })
        .throwOnError();
      await c
        .from("sessions")
        .insert({
          id: session,
          trader_id: trader,
          session_date: "2026-08-17",
          session_type: "regular",
        })
        .throwOnError();
      await c
        .from("setups")
        .insert({
          id: setup,
          trader_id: trader,
          name: `Setup ${label}`,
          timeframe: "5m",
          entry_rules: "entry",
          exit_rules: "exit",
          validation_rules: "valid",
        })
        .throwOnError();
    }
    const base = {
      tradingAccountId: ids.accountA,
      sessionId: ids.sessionA,
      setupId: ids.setupA,
      tradeDate: "2026-08-17",
      asset: "EURUSD",
      direction: "long",
      entryPrice: "1.1",
      stopLoss: "1",
      takeProfit: "1.2",
      exitPrice: "1.15",
      riskPercent: "1.25",
      positionSize: "2",
      result: "win",
      pnl: "125.50",
      executionQuality: "clean",
      notes: "atomic",
      errors: [
        { category: "process", severity: "low", description: "Late", solution: "Plan" },
        { category: "risk", severity: "medium", description: "Wide stop", solution: "Wait" },
      ],
    };
    const tradeId = await createTradeEntry(a, base);
    expect(
      (await a.from("trades").select("pnl_cents,risk_basis_points").eq("id", tradeId).single())
        .data,
    ).toEqual({ pnl_cents: 12550, risk_basis_points: 125 });
    expect((await a.from("trade_errors").select("id").eq("trade_id", tradeId)).data).toHaveLength(
      2,
    );
    expect((await b.from("trades").select("id").eq("id", tradeId)).data).toHaveLength(0);
    const before = (await a.from("trades").select("id")).data!.length;
    const invalid = await a.rpc("create_trade_with_errors", {
      target_trading_account_id: ids.accountA,
      target_session_id: ids.sessionA,
      target_setup_id: ids.setupA,
      target_trade_date: "2026-08-17",
      target_asset: "ROLLBACK",
      target_direction: "long",
      target_entry_price: 1,
      target_stop_loss: 0,
      target_take_profit: 2,
      target_risk_basis_points: 100,
      target_position_size: 1,
      target_result: "loss",
      target_errors: [{ category: "process", severity: "", description: "invalid" }],
    });
    expect(invalid.error).toBeTruthy();
    expect((await a.from("trades").select("id")).data).toHaveLength(before);
    for (const foreign of [
      { tradingAccountId: ids.accountB },
      { sessionId: ids.sessionB },
      { setupId: ids.setupB },
    ])
      await expect(createTradeEntry(a, { ...base, ...foreign, errors: [] })).rejects.toMatchObject({
        code: "PERSISTENCE_ERROR",
      });
    await createTradeEntry(a, {
      ...base,
      asset: "OPEN",
      exitPrice: "",
      pnl: "",
      result: "open",
      errors: [],
    });
    await createTradeEntry(a, { ...base, asset: "BE", pnl: "0", result: "breakeven", errors: [] });
    const overview = await getTradingOverview(a, {});
    expect(overview).toMatchObject({
      totalTradeCount: 3,
      closedTradeCount: 2,
      unresolvedTradeCount: 1,
      winCount: 1,
      breakevenCount: 1,
      tradeErrorCount: 2,
      tradesWithErrorsCount: 1,
    });
    const unsigned = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    expect(
      (
        await unsigned.rpc("create_trade_with_errors", {
          target_trading_account_id: ids.accountA,
          target_session_id: ids.sessionA,
          target_setup_id: ids.setupA,
          target_trade_date: "2026-08-17",
          target_asset: "ANON",
          target_direction: "long",
          target_entry_price: 1,
          target_stop_loss: 0,
          target_take_profit: 2,
          target_risk_basis_points: 100,
          target_position_size: 1,
          target_result: "x",
        })
      ).error,
    ).toBeTruthy();
  });
});
