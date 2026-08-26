import Link from "next/link";
import { cookies } from "next/headers";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/public-auth-forms";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string }>;
}) {
  const store = await cookies();
  const client = await getSupabaseServerClient();
  const user = client ? (await client.auth.getUser()).data.user : null;
  const authorized =
    (await searchParams).recovery === "authorized" &&
    store.get("phoenix-recovery-authorized")?.value === "1" &&
    Boolean(user);
  return (
    <AuthShell
      title="Choose a new password."
      description="Use a new password for your Phoenix account."
    >
      {authorized ? (
        <ResetPasswordForm />
      ) : (
        <div className="mt-8 grid gap-4">
          <p
            role="alert"
            className="rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
          >
            This recovery link is invalid or has expired.
          </p>
          <Link href="/forgot-password" className="text-center text-sm text-phoenix-orange">
            Request a new reset email
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
