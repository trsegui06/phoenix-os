import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { provisionCurrentTrader } from "@/services/trading/trader-provisioning";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;

async function signedUpClient(label: string) {
  const client = createClient<Database>(url!, key!, { auth: { persistSession: false } });
  const result = await client.auth.signUp({
    email: `onboarding-${label}-${Date.now()}-${Math.random()}@example.test`,
    password: "Phoenix-onboarding-123!",
  });
  expect(result.error).toBeNull();
  return { client, userId: result.data.user!.id };
}

describe.skipIf(!(url && key))("Trader provisioning local Supabase integration", () => {
  it("binds ownership to auth.uid and permits exactly one Trader", async () => {
    const { client, userId } = await signedUpClient("owner");
    const trader = await provisionCurrentTrader(client, { name: "Owner", timezone: "UTC" });
    const stored = await client.from("traders").select("auth_user_id").eq("id", trader.id).single();
    expect(stored.data?.auth_user_id).toBe(userId);
    await expect(
      provisionCurrentTrader(client, { name: "Again", timezone: "UTC" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("makes concurrent provisioning atomic", async () => {
    const { client } = await signedUpClient("race");
    const results = await Promise.allSettled([
      provisionCurrentTrader(client, { name: "First", timezone: "UTC" }),
      provisionCurrentTrader(client, { name: "Second", timezone: "UTC" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("blocks unauthenticated and cross-user creation and reads", async () => {
    const owner = await signedUpClient("a");
    const other = await signedUpClient("b");
    await provisionCurrentTrader(owner.client, { name: "A", timezone: "UTC" });
    expect(
      (await other.client.from("traders").select("id").eq("auth_user_id", owner.userId)).data,
    ).toEqual([]);
    const forged = await other.client
      .from("traders")
      .insert({ auth_user_id: owner.userId, name: "Forged", timezone: "UTC" });
    expect(forged.error).not.toBeNull();
    const anonymous = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    await expect(
      provisionCurrentTrader(anonymous, { name: "Anon", timezone: "UTC" }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
