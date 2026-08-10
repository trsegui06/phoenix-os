import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { CreateTradeInput } from "@/domain/trading/trade";
import { TradingApplicationError } from "@/services/trading/errors";
import { createTradingAccount } from "@/services/trading/trading-accounts";
import { createTradingSession as createSession } from "@/services/trading/trading-sessions";
import { createTradingSetup as createSetup } from "@/services/trading/trading-setups";
import { createTrade, getTrade, listTrades, updateTrade } from "@/services/trading/trades";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;
const enabled = Boolean(url && key);

const accountInput = (name: string) => ({
  broker: "Integration Broker",
  accountName: name,
  accountType: "cash",
  currency: "EUR",
  initialBalanceCents: 100_000,
  status: "active",
});

const sessionInput = { sessionDate: "2026-08-10", sessionType: "regular" };
const setupInput = (name: string) => ({
  name,
  timeframe: "5m",
  entryRules: "Breakout",
  exitRules: "Target",
  validationRules: "Confirm volume",
});

const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof TradingApplicationError ? error.code : "UNKNOWN";
  }
};

async function parents(client: SupabaseClient, name: string) {
  const account = await createTradingAccount(client, accountInput(`${name} account`));
  const session = await createSession(client, sessionInput);
  const setup = await createSetup(client, setupInput(`${name} setup`));
  return { account, session, setup };
}

describe.skipIf(!enabled)("Trade local Supabase integration", () => {
  it("enforces parent ownership, RLS isolation, and authenticated Trade corrections", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const password = `LocalOnly!${crypto.randomUUID()}`;
    const anon = createClient(url!, key!);
    const a = await anon.auth.signUp({ email: `trade-a-${suffix}@local.test`, password });
    const b = await anon.auth.signUp({ email: `trade-b-${suffix}@local.test`, password });
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

    const parentA = await parents(clientA, "A");
    const parentB = await parents(clientB, "B");
    const input: CreateTradeInput = {
      sessionId: parentA.session.id,
      setupId: parentA.setup.id,
      tradingAccountId: parentA.account.id,
      tradeDate: "2026-08-10",
      asset: "ES",
      direction: "long",
      entryPrice: 100,
      stopLoss: 99,
      takeProfit: 102,
      riskBasisPoints: 100,
      positionSize: 1,
      result: "planned",
      screenshots: ["trade-a.png"],
    };
    const tradeA = await createTrade(clientA, {
      ...input,
      traderId: "ownership-injection-is-ignored",
    } as CreateTradeInput);
    expect(tradeA.traderId).toBeTruthy();
    expect(tradeA.sessionId).toBe(parentA.session.id);
    expect(tradeA.setupId).toBe(parentA.setup.id);
    expect(tradeA.tradingAccountId).toBe(parentA.account.id);
    expect(tradeA.screenshots).toEqual(["trade-a.png"]);

    expect(await code(createTrade(clientA, { ...input, sessionId: parentB.session.id }))).toBe(
      "PERSISTENCE_ERROR",
    );
    expect(await code(createTrade(clientA, { ...input, setupId: parentB.setup.id }))).toBe(
      "PERSISTENCE_ERROR",
    );
    expect(
      await code(createTrade(clientA, { ...input, tradingAccountId: parentB.account.id })),
    ).toBe("PERSISTENCE_ERROR");

    expect((await listTrades(clientA)).map((trade) => trade.id)).toContain(tradeA.id);
    expect(await listTrades(clientB)).toHaveLength(0);
    expect((await getTrade(clientA, tradeA.id)).id).toBe(tradeA.id);
    expect(await code(getTrade(clientB, tradeA.id))).toBe("TRADING_TRADE_NOT_FOUND");
    expect(
      await updateTrade(clientA, tradeA.id, {
        notes: "Updated",
        executionQuality: "Good",
        exitPrice: 101,
        pnlCents: 100,
      }),
    ).toMatchObject({ notes: "Updated", executionQuality: "Good", exitPrice: 101, pnlCents: 100 });
    expect(await code(updateTrade(clientB, tradeA.id, { notes: "Blocked" }))).toBe(
      "TRADING_TRADE_NOT_FOUND",
    );
    expect(await code(updateTrade(clientA, tradeA.id, { sessionId: parentB.session.id }))).toBe(
      "PERSISTENCE_ERROR",
    );
    expect(await code(updateTrade(clientA, tradeA.id, { setupId: parentB.setup.id }))).toBe(
      "PERSISTENCE_ERROR",
    );
    expect(
      await code(updateTrade(clientA, tradeA.id, { tradingAccountId: parentB.account.id })),
    ).toBe("PERSISTENCE_ERROR");

    const unsigned = createClient(url!, key!, { auth: { persistSession: false } });
    expect(await code(createTrade(unsigned, input))).toBe("UNAUTHENTICATED");
    expect(await code(listTrades(unsigned))).toBe("UNAUTHENTICATED");
    expect(await code(getTrade(unsigned, tradeA.id))).toBe("UNAUTHENTICATED");
    expect(await code(updateTrade(unsigned, tradeA.id, { notes: "Blocked" }))).toBe(
      "UNAUTHENTICATED",
    );
  });
});
