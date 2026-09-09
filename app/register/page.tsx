import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/public-auth-forms";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasCurrentTrader } from "@/services/trading/trader-provisioning";

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  const client = await getSupabaseServerClient();
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (user) redirect((await hasCurrentTrader(client)) ? "/trading" : "/onboarding");
  }
  return (
    <AuthShell title={t("register.title")} description={t("register.description")}>
      <RegisterForm />
    </AuthShell>
  );
}
