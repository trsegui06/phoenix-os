import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasCurrentTrader } from "@/services/trading/trader-provisioning";

export default async function HomePage() {
  const client = await getSupabaseServerClient();
  if (!client) redirect("/login");

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");

  redirect((await hasCurrentTrader(client)) ? "/trading" : "/onboarding");
}
