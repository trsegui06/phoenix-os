import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/public-auth-forms";
import { getTranslations } from "next-intl/server";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string }>;
}) {
  const t = await getTranslations("auth");
  const invalid = (await searchParams).recovery === "invalid";
  return (
    <AuthShell title={t("forgot.title")} description={t("forgot.description")}>
      {invalid && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
        >
          {t("messages.invalidRecoveryLink")}
        </p>
      )}
      <ForgotPasswordForm />
    </AuthShell>
  );
}
