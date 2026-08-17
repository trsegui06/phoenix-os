import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";
import { resolveCurrentTraderId } from "@/services/trading/current-trader";
import { TradingApplicationError } from "@/services/trading/errors";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;
const enabled = Boolean(url && key);

describe.skipIf(!enabled)("Authentication local Supabase integration", () => {
  it("creates, validates, and destroys a real local session", async () => {
    const client = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const email = `auth-session-${Date.now()}-${Math.random()}@example.test`;
    const password = "Phoenix-auth-test-123!";

    const signup = await client.auth.signUp({ email, password });
    expect(signup.error).toBeNull();
    expect(signup.data.session).not.toBeNull();

    expect((await client.auth.signOut()).error).toBeNull();
    expect((await client.auth.getUser()).data.user).toBeNull();

    const signin = await client.auth.signInWithPassword({ email, password });
    expect(signin.error).toBeNull();
    expect((await client.auth.getUser()).data.user?.email).toBe(email);

    expect((await client.auth.signOut()).error).toBeNull();
    expect((await client.auth.getSession()).data.session).toBeNull();
  });

  it("fails safely when an authenticated user has no Trader profile", async () => {
    const client = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const email = `auth-profile-${Date.now()}-${Math.random()}@example.test`;
    const signup = await client.auth.signUp({ email, password: "Phoenix-auth-test-123!" });
    expect(signup.error).toBeNull();

    await expect(resolveCurrentTraderId(client)).rejects.toMatchObject({
      code: "TRADER_PROFILE_NOT_FOUND",
      message: "A Trader profile is required.",
    } satisfies Partial<TradingApplicationError>);
  });

  it("uses a generic provider error for invalid credentials", async () => {
    const client = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const result = await client.auth.signInWithPassword({
      email: `missing-${Date.now()}@example.test`,
      password: "wrong-password",
    });

    expect(result.error?.code).toBe("invalid_credentials");
    expect(result.data.session).toBeNull();
  });
});
