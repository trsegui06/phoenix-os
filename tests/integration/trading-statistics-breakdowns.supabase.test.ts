import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";
import { TradingApplicationError } from "@/services/trading/errors";
import {
  getTradingAssetBreakdown,
  getTradingErrorBreakdown,
  getTradingSessionTypeBreakdown,
  getTradingSetupBreakdown,
} from "@/services/trading/trading-statistics";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;

async function code(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof TradingApplicationError ? error.code : "UNKNOWN";
  }
}

describe.skipIf(!url || !key)("Trading Statistics Phase B local Supabase integration", () => {
  it("aggregates exact breakdown dimensions and preserves tenant/filter boundaries", async () => {
    const anon = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const suffix = `${Date.now()}-${Math.random()}`;
    const [authA, authB] = await Promise.all([
      anon.auth.signUp({
        email: `breakdown-a-${suffix}@example.com`,
        password: "Phoenix-test-123!",
      }),
      anon.auth.signUp({
        email: `breakdown-b-${suffix}@example.com`,
        password: "Phoenix-test-123!",
      }),
    ]);
    expect(authA.error).toBeNull();
    expect(authB.error).toBeNull();
    const A = createClient<Database>(url!, key!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${authA.data.session!.access_token}` } },
    });
    const B = createClient<Database>(url!, key!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${authB.data.session!.access_token}` } },
    });
    const traderA = randomUUID(),
      traderB = randomUUID(),
      eur = randomUUID(),
      usd = randomUUID(),
      accountB = randomUUID(),
      setup1 = randomUUID(),
      setup2 = randomUUID(),
      london = randomUUID(),
      lowerLondon = randomUUID();
    const trades = Array.from({ length: 5 }, () => randomUUID());

    expect(
      (
        await A.from("traders").insert({
          id: traderA,
          auth_user_id: authA.data.user!.id,
          name: "A",
          timezone: "UTC",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await B.from("traders").insert({
          id: traderB,
          auth_user_id: authB.data.user!.id,
          name: "B",
          timezone: "UTC",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await A.from("trading_accounts").insert([
          {
            id: eur,
            trader_id: traderA,
            broker: "B",
            account_name: "EUR",
            account_type: "cash",
            currency: "EUR",
            initial_balance_cents: 1,
            status: "active",
          },
          {
            id: usd,
            trader_id: traderA,
            broker: "B",
            account_name: "USD",
            account_type: "cash",
            currency: "USD",
            initial_balance_cents: 1,
            status: "active",
          },
        ])
      ).error,
    ).toBeNull();
    expect(
      (
        await B.from("trading_accounts").insert({
          id: accountB,
          trader_id: traderB,
          broker: "B",
          account_name: "B",
          account_type: "cash",
          currency: "GBP",
          initial_balance_cents: 1,
          status: "active",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await A.from("setups").insert([
          {
            id: setup1,
            trader_id: traderA,
            name: "Alpha",
            timeframe: "1h",
            entry_rules: "e",
            exit_rules: "x",
            validation_rules: "v",
          },
          {
            id: setup2,
            trader_id: traderA,
            name: "Beta",
            timeframe: "1h",
            entry_rules: "e",
            exit_rules: "x",
            validation_rules: "v",
          },
        ])
      ).error,
    ).toBeNull();
    expect(
      (
        await A.from("sessions").insert([
          {
            id: london,
            trader_id: traderA,
            session_date: "2026-01-01",
            session_type: "London",
          },
          {
            id: lowerLondon,
            trader_id: traderA,
            session_date: "2026-01-01",
            session_type: "london",
          },
        ])
      ).error,
    ).toBeNull();

    const row = (
      id: string,
      account: string,
      setup: string,
      session: string,
      asset: string,
      date: string,
      risk: number,
      pnl: number | null,
    ): Database["public"]["Tables"]["trades"]["Insert"] => ({
      id,
      trader_id: traderA,
      trading_account_id: account,
      setup_id: setup,
      session_id: session,
      asset,
      trade_date: date,
      risk_basis_points: risk,
      pnl_cents: pnl,
      direction: "long",
      entry_price: 10,
      stop_loss: 9,
      take_profit: 12,
      position_size: 1,
      result: "ignored",
    });
    expect(
      (
        await A.from("trades").insert([
          row(trades[0], eur, setup1, london, "ES", "2026-01-10", 100, 10_000),
          row(trades[1], usd, setup1, london, "ES", "2026-01-20", 200, -4_000),
          row(trades[2], eur, setup1, lowerLondon, "es", "2026-02-01", 300, 0),
          row(trades[3], eur, setup2, lowerLondon, "es", "2026-03-01", 400, null),
          row(trades[4], usd, setup2, london, "ES", "2026-02-15", 500, 5_000),
        ])
      ).error,
    ).toBeNull();
    expect(
      (
        await A.from("trade_errors").insert([
          { trade_id: trades[0], category: "FOMO", severity: "High", description: "1" },
          { trade_id: trades[0], category: "FOMO", severity: "Low", description: "2" },
          { trade_id: trades[1], category: "FOMO", severity: "High", description: "3" },
        ])
      ).error,
    ).toBeNull();

    const bySetup = await getTradingSetupBreakdown(A);
    expect(bySetup.map((group) => group.setupName)).toEqual(["Alpha", "Beta"]);
    expect(bySetup[0]?.metrics).toMatchObject({
      totalTradeCount: 3,
      closedTradeCount: 3,
      unresolvedTradeCount: 0,
      winCount: 1,
      lossCount: 1,
      breakevenCount: 1,
      winRate: 0.5,
      averageRiskBasisPoints: "200.0000000000000000",
    });
    expect(bySetup[0]?.metrics.realizedPnlByCurrency.map((group) => group.currency)).toEqual([
      "EUR",
      "USD",
    ]);
    expect(bySetup[1]?.metrics).toMatchObject({ totalTradeCount: 2, unresolvedTradeCount: 1 });

    const bySession = await getTradingSessionTypeBreakdown(A);
    expect(bySession.map((group) => group.sessionType)).toEqual(["london", "London"]);
    expect(bySession.find((group) => group.sessionType === "London")?.metrics.totalTradeCount).toBe(
      3,
    );
    expect(bySession.find((group) => group.sessionType === "london")?.metrics.totalTradeCount).toBe(
      2,
    );

    const byAsset = await getTradingAssetBreakdown(A);
    expect(byAsset.map((group) => group.asset)).toEqual(["es", "ES"]);
    expect(byAsset.find((group) => group.asset === "ES")?.metrics.totalTradeCount).toBe(3);
    expect(byAsset.find((group) => group.asset === "es")?.metrics.totalTradeCount).toBe(2);

    const errors = await getTradingErrorBreakdown(A);
    expect(errors.byCategory).toContainEqual({
      category: "FOMO",
      errorCount: 3,
      affectedTradeCount: 2,
    });
    expect(errors.bySeverity).toContainEqual({
      severity: "High",
      errorCount: 2,
      affectedTradeCount: 2,
    });

    expect(
      (
        await getTradingSetupBreakdown(A, { tradingAccountId: eur })
      )[0]?.metrics.realizedPnlByCurrency.map((x) => x.currency),
    ).toEqual(["EUR"]);
    expect(
      (await getTradingAssetBreakdown(A, { from: "2026-03-01" }))[0]?.metrics.unresolvedTradeCount,
    ).toBe(1);
    expect((await getTradingErrorBreakdown(A, { from: "2026-02-01" })).byCategory).toEqual([]);

    expect(await getTradingSetupBreakdown(B)).toEqual([]);
    expect(await getTradingSessionTypeBreakdown(B)).toEqual([]);
    expect(await getTradingAssetBreakdown(B)).toEqual([]);
    expect(await getTradingErrorBreakdown(B)).toEqual({ byCategory: [], bySeverity: [] });
    expect(await code(getTradingSetupBreakdown(A, { tradingAccountId: accountB }))).toBe(
      "PERSISTENCE_ERROR",
    );
    expect(await code(getTradingAssetBreakdown(B, { tradingAccountId: eur }))).toBe(
      "PERSISTENCE_ERROR",
    );
    const unsigned = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    expect(await code(getTradingSetupBreakdown(unsigned))).toBe("UNAUTHENTICATED");
    expect(await code(getTradingSessionTypeBreakdown(unsigned))).toBe("UNAUTHENTICATED");
    expect(await code(getTradingAssetBreakdown(unsigned))).toBe("UNAUTHENTICATED");
    expect(await code(getTradingErrorBreakdown(unsigned))).toBe("UNAUTHENTICATED");
    expect((await unsigned.rpc("trading_statistics_by_setup")).error).not.toBeNull();
  });
});
