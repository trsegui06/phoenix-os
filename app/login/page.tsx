import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { PhoenixMark } from "@/components/ui/phoenix-mark";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasCurrentTrader } from "@/services/trading/trader-provisioning";

export default async function LoginPage() {
  const client = await getSupabaseServerClient();
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (user) redirect((await hasCurrentTrader(client)) ? "/trading" : "/onboarding");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/85 p-6 shadow-sm shadow-black/20 sm:p-8"
      >
        <PhoenixMark />
        <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-phoenix-orange uppercase">
          Phoenix OS
        </p>
        <h1 id="login-title" className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Discipline before profit.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Sign in to continue to your trading workspace.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
