import { TraderRepository } from "@/data/trading/trader-repository";
import type { PhoenixSupabaseClient } from "@/lib/supabase/types";

import { TradingApplicationError } from "./errors";

export type ShellIdentity = { primary: string; secondary: string };

export function deriveShellIdentity(
  traderName?: string | null,
  email?: string | null,
): ShellIdentity {
  const safeName = traderName?.trim();
  const safeEmail = email?.trim();

  return {
    primary: safeName || safeEmail || "Trader",
    secondary: safeName && safeEmail ? safeEmail : "Trading workspace",
  };
}

export async function resolveCurrentTraderIdentity(
  client: PhoenixSupabaseClient,
): Promise<ShellIdentity> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) return deriveShellIdentity();

  try {
    const { data, error } = await new TraderRepository(client).findForAuthUser(user.id);
    return deriveShellIdentity(error ? null : data?.name, user.email);
  } catch {
    return deriveShellIdentity(null, user.email);
  }
}

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
