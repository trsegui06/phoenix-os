import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/public-auth-forms";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasCurrentTrader } from "@/services/trading/trader-provisioning";

export default async function RegisterPage() {
  const client = await getSupabaseServerClient();
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (user) redirect((await hasCurrentTrader(client)) ? "/trading" : "/onboarding");
  }
  return (
    <AuthShell
      title="Start your trading workspace."
      description="Create your account to begin building a disciplined trading process."
    >
      <RegisterForm />
    </AuthShell>
  );
}
