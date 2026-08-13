import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  createTradeError,
  getTradeError,
  listTradeErrors,
  updateTradeError,
} from "@/services/trading/trade-errors";
import { createTradingAccount } from "@/services/trading/trading-accounts";
import { createTradingSession } from "@/services/trading/trading-sessions";
import { createTradingSetup } from "@/services/trading/trading-setups";
import { createTrade } from "@/services/trading/trades";
import { TradingApplicationError } from "@/services/trading/errors";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;
const enabled = Boolean(url && key);

const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof TradingApplicationError ? error.code : "UNKNOWN";
  }
};

async function createOwnedTrade(client: SupabaseClient, name: string) {
  const account = await createTradingAccount(client, {
    broker: "Integration Broker",
    accountName: `${name} account`,
    accountType: "cash",
    currency: "EUR",
    initialBalanceCents: 100_000,
    status: "active",
  });
  const session = await createTradingSession(client, {
    sessionDate: "2026-08-10",
    sessionType: "regular",
  });
  const setup = await createTradingSetup(client, {
    name: `${name} setup`,
    timeframe: "5m",
    entryRules: "Breakout",
    exitRules: "Target",
    validationRules: "Confirm volume",
  });
  return createTrade(client, {
    sessionId: session.id,
    setupId: setup.id,
    tradingAccountId: account.id,
    tradeDate: "2026-08-10",
    asset: "ES",
    direction: "long",
    entryPrice: 100,
    stopLoss: 99,
    takeProfit: 102,
    riskBasisPoints: 100,
    positionSize: 1,
    result: "planned",
  });
}

describe.skipIf(!enabled)("Trade Error local Supabase integration", () => {
  it("enforces authenticated Trade Error ownership through the Trade parent", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const password = `LocalOnly!${crypto.randomUUID()}`;
    const anon = createClient(url!, key!);
    const a = await anon.auth.signUp({ email: `trade-error-a-${suffix}@local.test`, password });
    const b = await anon.auth.signUp({ email: `trade-error-b-${suffix}@local.test`, password });
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

    const tradeA = await createOwnedTrade(clientA, "A");
    const tradeB = await createOwnedTrade(clientB, "B");
    const errorA = await createTradeError(clientA, {
      tradeId: tradeA.id,
      category: "execution",
      severity: "high",
      description: "Entered early",
      solution: "Wait for confirmation",
    });
    expect(errorA.tradeId).toBe(tradeA.id);
    expect(errorA.category).toBe("execution");
    expect((await listTradeErrors(clientA)).map((tradeError) => tradeError.id)).toContain(
      errorA.id,
    );
    expect(await listTradeErrors(clientB)).toHaveLength(0);
    expect((await getTradeError(clientA, errorA.id)).id).toBe(errorA.id);
    expect(await code(getTradeError(clientB, errorA.id))).toBe("TRADING_TRADE_ERROR_NOT_FOUND");
    expect(
      await updateTradeError(clientA, errorA.id, {
        description: "Updated correction",
        solution: "Updated solution",
      }),
    ).toMatchObject({ description: "Updated correction", solution: "Updated solution" });
    expect(await code(updateTradeError(clientB, errorA.id, { severity: "low" }))).toBe(
      "TRADING_TRADE_ERROR_NOT_FOUND",
    );
    expect(
      await code(
        createTradeError(clientA, {
          tradeId: tradeB.id,
          category: "execution",
          severity: "high",
          description: "Cross-owner attempt",
        }),
      ),
    ).toBe("PERSISTENCE_ERROR");

    const unsigned = createClient(url!, key!, { auth: { persistSession: false } });
    expect(
      await code(
        createTradeError(unsigned, {
          tradeId: tradeA.id,
          category: "execution",
          severity: "high",
          description: "Blocked",
        }),
      ),
    ).toBe("UNAUTHENTICATED");
    expect(await code(listTradeErrors(unsigned))).toBe("UNAUTHENTICATED");
    expect(await code(getTradeError(unsigned, errorA.id))).toBe("UNAUTHENTICATED");
    expect(await code(updateTradeError(unsigned, errorA.id, { severity: "low" }))).toBe(
      "UNAUTHENTICATED",
    );
  });
});
