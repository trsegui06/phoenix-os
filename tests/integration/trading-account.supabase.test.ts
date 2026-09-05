import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  createTradingAccount,
  deleteTradingAccount,
  getTradingAccount,
  listTradingAccounts,
  updateTradingAccount,
} from "@/services/trading/trading-accounts";
import { TradingAccountRepository } from "@/data/trading/trading-account-repository";
import { TradingAccountApplicationError } from "@/services/trading/errors";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;
const enabled = Boolean(url && key);
const input = {
  broker: "Integration Broker",
  accountName: "Integration Account",
  accountType: "cash",
  currency: "EUR",
  initialBalanceCents: 100_000,
  status: "active",
};
const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof TradingAccountApplicationError ? error.code : "UNKNOWN";
  }
};
describe.skipIf(!enabled)("Trading Account local Supabase integration", () => {
  it("enforces authenticated owner-only account workflows", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const password = `LocalOnly!${crypto.randomUUID()}`;
    const anon = createClient(url!, key!);
    const a = await anon.auth.signUp({ email: `account-a-${suffix}@local.test`, password });
    const b = await anon.auth.signUp({ email: `account-b-${suffix}@local.test`, password });
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
    const accountA = await createTradingAccount(clientA, input);
    expect(accountA.traderId).toBeTruthy();
    expect((await listTradingAccounts(clientA)).map((x) => x.id)).toContain(accountA.id);
    expect(await listTradingAccounts(clientB)).toHaveLength(0);
    expect((await getTradingAccount(clientA, accountA.id)).id).toBe(accountA.id);
    expect(await code(getTradingAccount(clientB, accountA.id))).toBe("TRADING_ACCOUNT_NOT_FOUND");
    expect(
      (
        await updateTradingAccount(clientA, accountA.id, {
          accountName: "Updated",
          status: "review",
        })
      ).accountName,
    ).toBe("Updated");
    expect(await code(updateTradingAccount(clientB, accountA.id, { status: "blocked" }))).toBe(
      "TRADING_ACCOUNT_NOT_FOUND",
    );
    expect(await code(deleteTradingAccount(clientB, accountA.id))).toBe(
      "TRADING_ACCOUNT_NOT_FOUND",
    );
    expect(await code(deleteTradingAccount(clientA, crypto.randomUUID()))).toBe(
      "TRADING_ACCOUNT_NOT_FOUND",
    );

    const empty = await createTradingAccount(clientA, {
      ...input,
      accountName: `Empty ${suffix}`,
    });
    await deleteTradingAccount(clientA, empty.id);
    expect(await code(getTradingAccount(clientA, empty.id))).toBe("TRADING_ACCOUNT_NOT_FOUND");

    const used = await createTradingAccount(clientA, {
      ...input,
      accountName: `Used ${suffix}`,
    });
    const session = await clientA
      .from("sessions")
      .insert({
        trader_id: used.traderId,
        session_date: "2026-09-05",
        session_type: "regular",
      })
      .select("id")
      .single();
    expect(session.error).toBeNull();
    const setup = await clientA
      .from("setups")
      .insert({
        trader_id: used.traderId,
        name: `Delete guard ${suffix}`,
        timeframe: "5m",
        entry_rules: "Enter",
        exit_rules: "Exit",
        validation_rules: "Validate",
      })
      .select("id")
      .single();
    expect(setup.error).toBeNull();
    await clientA
      .from("trades")
      .insert({
        trader_id: used.traderId,
        trading_account_id: used.id,
        session_id: session.data!.id,
        setup_id: setup.data!.id,
        trade_date: "2026-09-05",
        asset: "EURUSD",
        direction: "long",
        entry_price: 1.1,
        stop_loss: 1.09,
        take_profit: 1.12,
        position_size: 1,
        risk_basis_points: 100,
        result: "win",
        pnl_cents: 100,
        screenshots: [],
      })
      .throwOnError();
    expect(await code(deleteTradingAccount(clientA, used.id))).toBe("TRADING_ACCOUNT_IN_USE");
    const raceDefense = await new TradingAccountRepository(clientA).deleteForCurrentTrader(
      used.id,
      used.traderId,
    );
    expect(raceDefense).toMatchObject({ deleted: false, error: null });
    expect((await getTradingAccount(clientA, used.id)).id).toBe(used.id);
    expect(await code(createTradingAccount(clientA, { ...input, accountName: "Updated" }))).toBe(
      "CONFLICT",
    );
    expect(
      await code(
        createTradingAccount(clientA, { ...input, accountName: "Invalid", currentBalanceCents: 1 }),
      ),
    ).toBe("VALIDATION_ERROR");
    expect(
      await code(
        listTradingAccounts(createClient(url!, key!, { auth: { persistSession: false } })),
      ),
    ).toBe("UNAUTHENTICATED");
  });
});
