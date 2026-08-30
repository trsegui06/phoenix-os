import type { ReactNode } from "react";

import { AppShell } from "@/components/navigation/app-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  deriveShellIdentity,
  resolveCurrentTraderIdentity,
} from "@/services/trading/current-trader";

export default async function TradingLayout({ children }: { children: ReactNode }) {
  const client = await getSupabaseServerClient();
  const identity = client ? await resolveCurrentTraderIdentity(client) : deriveShellIdentity();

  return <AppShell identity={identity}>{children}</AppShell>;
}
