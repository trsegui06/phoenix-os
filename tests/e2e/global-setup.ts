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

    if (credentials.email === e2eUser.email) {
      const userId = signin.data.user.id;
      const existing = await client
        .from("traders")
        .select("id")
        .eq("auth_user_id", userId)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (!existing.data) {
        const profile = await client.from("traders").insert({
          auth_user_id: userId,
          name: "Phoenix E2E Trader",
          timezone: "UTC",
        });
        if (profile.error) throw profile.error;
      }
    }

    const signout = await client.auth.signOut();
    if (signout.error) throw signout.error;
  }
}
