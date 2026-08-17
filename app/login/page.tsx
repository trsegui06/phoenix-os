import { redirect } from "next/navigation";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { PhoenixMark } from "@/components/ui/phoenix-mark";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasCurrentTrader } from "@/services/trading/trader-provisioning";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; auth?: string }>;
}) {
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
        {(await searchParams).reset === "success" && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200"
          >
            Password updated. Sign in with your new password.
          </p>
        )}
        {(await searchParams).auth === "invalid" && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
          >
            This authentication link is invalid or has expired.
          </p>
        )}
        <LoginForm />
        <nav aria-label="Account access" className="mt-6 flex justify-between gap-4 text-sm">
          <Link href="/register" className="text-phoenix-orange hover:text-orange-300">
            Create account
          </Link>
          <Link href="/forgot-password" className="text-slate-400 hover:text-white">
            Forgot password?
          </Link>
        </nav>
      </section>
    </main>
  );
}
