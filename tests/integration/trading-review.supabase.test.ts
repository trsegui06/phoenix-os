import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createTradingAccount } from "@/services/trading/trading-accounts";
import { createTradingSession } from "@/services/trading/trading-sessions";
import { createTradingSetup } from "@/services/trading/trading-setups";
import { createTrade } from "@/services/trading/trades";
import { createTradingObjective } from "@/services/trading/trading-objectives";
import {
  createTradingReview,
  getTradingReview,
  listTradingReviews,
  updateTradingReview,
} from "@/services/trading/trading-reviews";
import { TradingApplicationError } from "@/services/trading/errors";
const url = process.env.PHOENIX_SUPABASE_URL,
  key = process.env.PHOENIX_SUPABASE_ANON_KEY,
  enabled = Boolean(url && key);
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof TradingApplicationError ? e.code : "UNKNOWN";
  }
};
async function resources(c: SupabaseClient, n: string) {
  const a = await createTradingAccount(c, {
      broker: "B",
      accountName: n,
      accountType: "cash",
      currency: "EUR",
      initialBalanceCents: 1,
      status: "active",
    }),
    s = await createTradingSession(c, { sessionDate: "2026-08-10", sessionType: "regular" }),
    u = await createTradingSetup(c, {
      name: n,
      timeframe: "5m",
      entryRules: "E",
      exitRules: "X",
      validationRules: "V",
    });
  const trade = async (x: string) =>
    createTrade(c, {
      sessionId: s.id,
      setupId: u.id,
      tradingAccountId: a.id,
      tradeDate: "2026-08-10",
      asset: x,
      direction: "long",
      entryPrice: 1,
      stopLoss: 0,
      takeProfit: 2,
      riskBasisPoints: 0,
      positionSize: 1,
      result: "r",
    });
  return {
    trades: [await trade("A"), await trade("B")],
    objectives: [
      await createTradingObjective(c, { title: `${n}1`, status: "active" }),
      await createTradingObjective(c, { title: `${n}2`, status: "active" }),
    ],
  };
}
describe.skipIf(!enabled)("Trading Review local Supabase integration", () => {
  it("enforces owner-only reviews and replaces only own links", async () => {
    const x = crypto.randomUUID().slice(0, 8),
      p = `LocalOnly!${crypto.randomUUID()}`,
      anon = createClient(url!, key!),
      a = await anon.auth.signUp({ email: `ra-${x}@local.test`, password: p }),
      b = await anon.auth.signUp({ email: `rb-${x}@local.test`, password: p });
    const A = createClient(url!, key!, {
        global: { headers: { Authorization: `Bearer ${a.data.session!.access_token}` } },
      }),
      B = createClient(url!, key!, {
        global: { headers: { Authorization: `Bearer ${b.data.session!.access_token}` } },
      });
    await A.from("traders")
      .insert({ auth_user_id: a.data.user!.id, name: "A", timezone: "UTC" })
      .throwOnError();
    await B.from("traders")
      .insert({ auth_user_id: b.data.user!.id, name: "B", timezone: "UTC" })
      .throwOnError();
    const ra = await resources(A, "A"),
      rb = await resources(B, "B");
    expect(
      await code(
        createTradingReview(A, {
          reviewType: "weekly",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-07",
          tradeIds: [rb.trades[0].id],
        }),
      ),
    ).toBe("PERSISTENCE_ERROR");
    expect(
      await code(
        createTradingReview(A, {
          reviewType: "weekly",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-07",
          objectiveIds: [rb.objectives[0].id],
        }),
      ),
    ).toBe("PERSISTENCE_ERROR");
    const review = await createTradingReview(A, {
      reviewType: "weekly",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-07",
      tradeIds: ra.trades.map((t) => t.id),
      objectiveIds: [ra.objectives[0].id],
      traderId: "ownership-injection-is-ignored",
    } as Parameters<typeof createTradingReview>[1]);
    expect(review.traderId).not.toBe("ownership-injection-is-ignored");
    expect(review.tradeIds).toHaveLength(2);
    expect(await listTradingReviews(B)).toHaveLength(0);
    expect(await code(getTradingReview(B, review.id))).toBe("TRADING_REVIEW_NOT_FOUND");
    expect(await code(updateTradingReview(B, review.id, { summary: "Blocked" }))).toBe(
      "TRADING_REVIEW_NOT_FOUND",
    );
    const updated = await updateTradingReview(A, review.id, {
      tradeIds: [ra.trades[1].id],
      objectiveIds: [ra.objectives[1].id],
      summary: "Updated",
    });
    expect(updated.tradeIds).toEqual([ra.trades[1].id]);
    expect(updated.objectiveIds).toEqual([ra.objectives[1].id]);
    await A.rpc("replace_review_trade_links", {
      target_review_id: review.id,
      target_trade_ids: [ra.trades[0].id],
    }).throwOnError();
    const failedTradeReplacement = await A.rpc("replace_review_trade_links", {
      target_review_id: review.id,
      target_trade_ids: [ra.trades[1].id, rb.trades[0].id],
    });
    expect(failedTradeReplacement.error).not.toBeNull();
    expect((await getTradingReview(A, review.id)).tradeIds).toEqual([ra.trades[0].id]);
    await A.rpc("replace_review_objective_links", {
      target_review_id: review.id,
      target_objective_ids: [ra.objectives[0].id],
    }).throwOnError();
    const failedObjectiveReplacement = await A.rpc("replace_review_objective_links", {
      target_review_id: review.id,
      target_objective_ids: [ra.objectives[1].id, rb.objectives[0].id],
    });
    expect(failedObjectiveReplacement.error).not.toBeNull();
    expect((await getTradingReview(A, review.id)).objectiveIds).toEqual([ra.objectives[0].id]);
    await A.rpc("replace_review_trade_links", {
      target_review_id: review.id,
      target_trade_ids: [ra.trades[0].id, ra.trades[1].id, ra.trades[1].id],
    }).throwOnError();
    expect(new Set((await getTradingReview(A, review.id)).tradeIds)).toEqual(
      new Set([ra.trades[0].id, ra.trades[1].id]),
    );
    await A.rpc("replace_review_trade_links", {
      target_review_id: review.id,
      target_trade_ids: [],
    }).throwOnError();
    await A.rpc("replace_review_objective_links", {
      target_review_id: review.id,
      target_objective_ids: [],
    }).throwOnError();
    expect((await getTradingReview(A, review.id)).tradeIds).toEqual([]);
    expect((await getTradingReview(A, review.id)).objectiveIds).toEqual([]);
    expect(
      (
        await B.rpc("replace_review_trade_links", {
          target_review_id: review.id,
          target_trade_ids: [rb.trades[0].id],
        })
      ).error,
    ).not.toBeNull();
    expect(await code(updateTradingReview(A, review.id, { tradeIds: [rb.trades[0].id] }))).toBe(
      "PERSISTENCE_ERROR",
    );
    expect(
      await code(updateTradingReview(A, review.id, { objectiveIds: [rb.objectives[0].id] })),
    ).toBe("PERSISTENCE_ERROR");
    const U = createClient(url!, key!, { auth: { persistSession: false } });
    expect(
      (
        await U.rpc("replace_review_trade_links", {
          target_review_id: review.id,
          target_trade_ids: [],
        })
      ).error,
    ).not.toBeNull();
    expect(
      await code(
        createTradingReview(U, {
          reviewType: "x",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-01",
        }),
      ),
    ).toBe("UNAUTHENTICATED");
    expect(await code(listTradingReviews(U))).toBe("UNAUTHENTICATED");
    expect(await code(getTradingReview(U, review.id))).toBe("UNAUTHENTICATED");
    expect(await code(updateTradingReview(U, review.id, { summary: "x" }))).toBe("UNAUTHENTICATED");
  }, 30_000);
});
