import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { PhoenixMark } from "@/components/ui/phoenix-mark";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasCurrentTrader } from "@/services/trading/trader-provisioning";

export default async function OnboardingPage() {
  const client = await getSupabaseServerClient();
  if (!client) redirect("/login");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  if (await hasCurrentTrader(client)) redirect("/trading");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section
        aria-labelledby="onboarding-title"
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/85 p-6 shadow-sm shadow-black/20 sm:p-8"
      >
        <PhoenixMark />
        <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-phoenix-orange uppercase">
          Phoenix OS
        </p>
        <h1 id="onboarding-title" className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Build your trading workspace.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Create the Trader profile that owns your private Trading data.
        </p>
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm leading-6 text-slate-400">
          <p>Next, you will configure a Trading Account, Session, and Setup.</p>
          <p>Then you can record your first Trade.</p>
        </div>
        <OnboardingForm />
      </section>
    </main>
  );
}
