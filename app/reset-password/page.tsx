import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/public-auth-forms";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string }>;
}) {
  const t = await getTranslations("auth");
  const authorized = (await searchParams).recovery === "authorized";
  return (
    <AuthShell title={t("reset.title")} description={t("reset.description")}>
      {authorized ? (
        <ResetPasswordForm />
      ) : (
        <div className="mt-8 grid gap-4">
          <p
            role="alert"
            className="rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
          >
            {t("messages.invalidRecoveryLink")}
          </p>
          <Link href="/forgot-password" className="text-center text-sm text-phoenix-orange">
            {t("links.requestNewReset")}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
