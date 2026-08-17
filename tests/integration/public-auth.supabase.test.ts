import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

const url = process.env.PHOENIX_SUPABASE_URL;
const key = process.env.PHOENIX_SUPABASE_ANON_KEY;

describe.skipIf(!(url && key))("Public authentication local Supabase integration", () => {
  it("creates an immediate local session without automatically creating a Trader", async () => {
    const client = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const email = `public-signup-${Date.now()}-${Math.random()}@example.test`;
    const result = await client.auth.signUp({ email, password: "Phoenix-public-123!" });
    expect(result.error).toBeNull();
    expect(result.data.session).not.toBeNull();
    const traders = await client.from("traders").select("id");
    expect(traders.error).toBeNull();
    expect(traders.data).toEqual([]);
  });

  it("documents the local provider duplicate signal that the application masks", async () => {
    const client = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const credentials = {
      email: `public-duplicate-${Date.now()}-${Math.random()}@example.test`,
      password: "Phoenix-public-123!",
    };
    expect((await client.auth.signUp(credentials)).error).toBeNull();
    await client.auth.signOut();
    const repeated = await client.auth.signUp(credentials);
    expect(repeated.error?.code).toBe("user_already_exists");
  });

  it("rejects provider-invalid email and weak password safely", async () => {
    const client = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    expect(
      (await client.auth.signUp({ email: "invalid", password: "Phoenix-public-123!" })).error,
    ).not.toBeNull();
    expect(
      (await client.auth.signUp({ email: `weak-${Date.now()}@example.test`, password: "123" }))
        .error,
    ).not.toBeNull();
  });
});
