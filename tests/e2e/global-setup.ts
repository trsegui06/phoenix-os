import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { e2eMissingProfileUser, e2eUser } from "./auth-fixture";

export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Local Supabase environment variables are required for authentication E2E.");
  }

  const client = createClient<Database>(url, key, { auth: { persistSession: false } });
  for (const credentials of [e2eUser, e2eMissingProfileUser]) {
    const signup = await client.auth.signUp(credentials);
    if (signup.error && signup.error.code !== "user_already_exists") throw signup.error;

    const signin = await client.auth.signInWithPassword(credentials);
    if (signin.error) throw signin.error;

    if (credentials.email !== e2eMissingProfileUser.email) {
      const userId = signin.data.user.id;
      const existing = await client
        .from("traders")
        .select("id")
        .eq("auth_user_id", userId)
        .maybeSingle();
      if (existing.error) throw existing.error;
      let traderId = existing.data?.id;
      if (!traderId) {
        const profile = await client
          .from("traders")
          .insert({ auth_user_id: userId, name: "Phoenix E2E Trader", timezone: "UTC" })
          .select("id")
          .single();
        if (profile.error) throw profile.error;
        traderId = profile.data.id;
      }
      const account = await client
        .from("trading_accounts")
        .select("id")
        .eq("trader_id", traderId)
        .eq("account_name", "E2E EUR Account")
        .maybeSingle();
      if (account.error) throw account.error;
      if (!account.data)
        await client
          .from("trading_accounts")
          .insert({
            trader_id: traderId,
            broker: "Phoenix Broker",
            account_name: "E2E EUR Account",
            account_type: "cash",
            currency: "EUR",
            initial_balance_cents: 100000,
            status: "active",
          })
          .throwOnError();
      const session = await client
        .from("sessions")
        .select("id")
        .eq("trader_id", traderId)
        .eq("session_date", "2026-08-17")
        .maybeSingle();
      if (session.error) throw session.error;
      if (!session.data)
        await client
          .from("sessions")
          .insert({ trader_id: traderId, session_date: "2026-08-17", session_type: "regular" })
          .throwOnError();
      const setup = await client
        .from("setups")
        .select("id")
        .eq("trader_id", traderId)
        .eq("name", "E2E Breakout")
        .maybeSingle();
      if (setup.error) throw setup.error;
      if (!setup.data)
        await client
          .from("setups")
          .insert({
            trader_id: traderId,
            name: "E2E Breakout",
            timeframe: "5m",
            entry_rules: "Breakout",
            exit_rules: "Target",
            validation_rules: "Confirm",
          })
          .throwOnError();
    }

    const signout = await client.auth.signOut();
    if (signout.error) throw signout.error;
  }
}
