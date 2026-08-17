import type { PhoenixSupabaseClient } from "@/lib/supabase/types";

import { TradingApplicationError } from "./errors";

export async function resolveCurrentTraderId(client: PhoenixSupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new TradingApplicationError("UNAUTHENTICATED", "Authentication is required.");
  }

  const { data, error } = await client
    .from("traders")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new TradingApplicationError("PERSISTENCE_ERROR", "Unable to resolve the Trader profile.");
  }

  if (!data) {
    throw new TradingApplicationError("TRADER_PROFILE_NOT_FOUND", "A Trader profile is required.");
  }

  return data.id;
}
