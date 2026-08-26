import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCurrentTraderId } from "@/services/trading/current-trader";
import { TradingApplicationError } from "@/services/trading/errors";

export async function getReviewPageClient() {
  const client = await getSupabaseServerClient();
  if (!client) redirect("/login");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  try {
    await resolveCurrentTraderId(client);
  } catch (error) {
    if (error instanceof TradingApplicationError && error.code === "TRADER_PROFILE_NOT_FOUND")
      redirect("/onboarding");
    throw error;
  }
  return client;
}
