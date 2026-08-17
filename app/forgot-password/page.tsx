import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/public-auth-forms";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string }>;
}) {
  const invalid = (await searchParams).recovery === "invalid";
  return (
    <AuthShell
      title="Recover your Phoenix access."
      description="Enter your email and we will send password reset instructions if an account exists."
    >
      {invalid && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
        >
          This recovery link is invalid or has expired.
        </p>
      )}
      <ForgotPasswordForm />
    </AuthShell>
  );
}
