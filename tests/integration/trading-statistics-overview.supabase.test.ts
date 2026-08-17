import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";
import { TradingApplicationError } from "@/services/trading/errors";
import { getTradingOverview } from "@/services/trading/trading-statistics";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;
const enabled = Boolean(url && key);

async function errorCode(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof TradingApplicationError ? error.code : "UNKNOWN";
  }
}

describe.skipIf(!enabled)("Trading Statistics Overview local Supabase integration", () => {
  it("preserves Phase A semantics, exact currency groups, scopes, and tenant isolation", async () => {
    const anon = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const suffix = `${Date.now()}-${Math.random()}`;
    const [signedA, signedB] = await Promise.all([
      anon.auth.signUp({
        email: `statistics-a-${suffix}@example.com`,
        password: "Phoenix-test-123!",
      }),
      anon.auth.signUp({
        email: `statistics-b-${suffix}@example.com`,
        password: "Phoenix-test-123!",
      }),
    ]);
    expect(signedA.error).toBeNull();
    expect(signedB.error).toBeNull();

    const clientA = createClient<Database>(url!, key!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${signedA.data.session!.access_token}` } },
    });
    const clientB = createClient<Database>(url!, key!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${signedB.data.session!.access_token}` } },
    });

    const traderA = randomUUID();
    const traderB = randomUUID();
    const accountEur = randomUUID();
    const accountUsd = randomUUID();
    const accountB = randomUUID();
    const sessionA = randomUUID();
    const setupA = randomUUID();
    const tradeIds = Array.from({ length: 5 }, () => randomUUID());

    expect(
      (
        await clientA.from("traders").insert({
          id: traderA,
          auth_user_id: signedA.data.user!.id,
          name: "Statistics A",
          timezone: "UTC",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await clientB.from("traders").insert({
          id: traderB,
          auth_user_id: signedB.data.user!.id,
          name: "Statistics B",
          timezone: "UTC",
        })
      ).error,
    ).toBeNull();

    expect(
      (
        await clientA.from("trading_accounts").insert([
          {
            id: accountEur,
            trader_id: traderA,
            broker: "Broker",
            account_name: "EUR",
            account_type: "cash",
            currency: "EUR",
            initial_balance_cents: 100_000,
            status: "active",
          },
          {
            id: accountUsd,
            trader_id: traderA,
            broker: "Broker",
            account_name: "USD",
            account_type: "cash",
            currency: "USD",
            initial_balance_cents: 100_000,
            status: "active",
          },
        ])
      ).error,
    ).toBeNull();
    expect(
      (
        await clientB.from("trading_accounts").insert({
          id: accountB,
          trader_id: traderB,
          broker: "Broker",
          account_name: "B",
          account_type: "cash",
          currency: "GBP",
          initial_balance_cents: 100_000,
          status: "active",
        })
      ).error,
    ).toBeNull();

    expect(
      (
        await clientA.from("sessions").insert({
          id: sessionA,
          trader_id: traderA,
          session_date: "2026-01-01",
          session_type: "regular",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await clientA.from("setups").insert({
          id: setupA,
          trader_id: traderA,
          name: "Statistics Setup",
          timeframe: "1h",
          market_condition: "test",
          entry_rules: "entry",
          exit_rules: "exit",
          validation_rules: "validate",
        })
      ).error,
    ).toBeNull();

    const trade = (
      id: string,
      trading_account_id: string,
      trade_date: string,
      risk_basis_points: number,
      pnl_cents: number | null,
    ): Database["public"]["Tables"]["trades"]["Insert"] => ({
      id,
      trader_id: traderA,
      session_id: sessionA,
      setup_id: setupA,
      trading_account_id,
      trade_date,
      asset: "TEST",
      direction: "long",
      entry_price: 100,
      stop_loss: 99,
      take_profit: 102,
      risk_basis_points,
      position_size: 1,
      result: "source text ignored",
      pnl_cents,
    });
    expect(
      (
        await clientA
          .from("trades")
          .insert([
            trade(tradeIds[0], accountEur, "2026-01-10", 100, 10_000),
            trade(tradeIds[1], accountEur, "2026-01-20", 200, -4_000),
            trade(tradeIds[2], accountEur, "2026-02-01", 300, 0),
            trade(tradeIds[3], accountEur, "2026-03-01", 400, null),
            trade(tradeIds[4], accountUsd, "2026-02-15", 500, 5_000),
          ])
      ).error,
    ).toBeNull();
    expect(
      (
        await clientA.from("trade_errors").insert([
          { trade_id: tradeIds[0], category: "process", severity: "low", description: "one" },
          { trade_id: tradeIds[0], category: "process", severity: "low", description: "two" },
          { trade_id: tradeIds[1], category: "risk", severity: "high", description: "three" },
        ])
      ).error,
    ).toBeNull();
    expect(
      (
        await clientA.from("reviews").insert([
          {
            trader_id: traderA,
            review_type: "monthly",
            period_start: "2026-01-01",
            period_end: "2026-01-31",
          },
          {
            trader_id: traderA,
            review_type: "monthly",
            period_start: "2026-02-10",
            period_end: "2026-03-10",
          },
        ])
      ).error,
    ).toBeNull();
    expect(
      (
        await clientA.from("objectives").insert([
          { trader_id: traderA, title: "One", status: "active" },
          { trader_id: traderA, title: "Two", status: "done" },
        ])
      ).error,
    ).toBeNull();

    const overview = await getTradingOverview(clientA);
    expect(overview).toMatchObject({
      totalTradeCount: 5,
      closedTradeCount: 4,
      unresolvedTradeCount: 1,
      winCount: 2,
      lossCount: 1,
      breakevenCount: 1,
      averageRiskBasisPoints: "300.0000000000000000",
      tradeErrorCount: 3,
      tradesWithErrorsCount: 2,
      reviewCount: 2,
      objectiveCount: 2,
    });
    expect(overview.winRate).toBeCloseTo(2 / 3);
    expect(overview.tradeErrorRate).toBe(0.4);
    expect(overview.totalTradeCount).toBe(
      overview.closedTradeCount + overview.unresolvedTradeCount,
    );
    expect(overview.closedTradeCount).toBe(
      overview.winCount + overview.lossCount + overview.breakevenCount,
    );
    expect(overview.realizedPnlByCurrency).toEqual([
      {
        currency: "EUR",
        realizedPnlCents: "6000",
        averagePnlCents: "2000.0000000000000000",
        grossProfitCents: "10000",
        grossLossCents: "-4000",
      },
      {
        currency: "USD",
        realizedPnlCents: "5000",
        averagePnlCents: "5000.0000000000000000",
        grossProfitCents: "5000",
        grossLossCents: "0",
      },
    ]);

    const eur = await getTradingOverview(clientA, { tradingAccountId: accountEur });
    expect(eur).toMatchObject({
      totalTradeCount: 4,
      tradeErrorCount: 3,
      tradesWithErrorsCount: 2,
      tradeErrorRate: 0.5,
      reviewCount: 2,
      objectiveCount: 2,
    });
    expect(eur.realizedPnlByCurrency.map((group) => group.currency)).toEqual(["EUR"]);

    const february = await getTradingOverview(clientA, {
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(february).toMatchObject({
      totalTradeCount: 2,
      breakevenCount: 1,
      winCount: 1,
      tradeErrorCount: 0,
      tradesWithErrorsCount: 0,
      reviewCount: 1,
      objectiveCount: 2,
    });
    expect((await getTradingOverview(clientA, { from: "2026-03-01" })).totalTradeCount).toBe(1);
    expect((await getTradingOverview(clientA, { to: "2026-01-20" })).totalTradeCount).toBe(2);

    const breakevenOnly = await getTradingOverview(clientA, {
      from: "2026-02-01",
      to: "2026-02-01",
    });
    expect(breakevenOnly.winRate).toBeNull();

    const zero = await getTradingOverview(clientB);
    expect(zero).toMatchObject({
      totalTradeCount: 0,
      closedTradeCount: 0,
      unresolvedTradeCount: 0,
      winRate: null,
      averageRiskBasisPoints: null,
      realizedPnlByCurrency: [],
      tradeErrorCount: 0,
      tradesWithErrorsCount: 0,
      tradeErrorRate: null,
      reviewCount: 0,
      objectiveCount: 0,
    });
    expect(await errorCode(getTradingOverview(clientA, { tradingAccountId: accountB }))).toBe(
      "PERSISTENCE_ERROR",
    );
    expect(await errorCode(getTradingOverview(clientB, { tradingAccountId: accountEur }))).toBe(
      "PERSISTENCE_ERROR",
    );

    const unsigned = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    expect(await errorCode(getTradingOverview(unsigned))).toBe("UNAUTHENTICATED");
    expect((await unsigned.rpc("trading_statistics_overview")).error).not.toBeNull();
  });
});
