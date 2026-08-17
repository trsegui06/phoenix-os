"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { trustedSiteUrl, validateEmail, validateNewPassword } from "@/lib/auth/public-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PublicAuthState = {
  message?: string;
  success?: boolean;
  fieldErrors?: { email?: string; password?: string; confirmPassword?: string };
};

const genericSignup = "If this address can be registered, check your email for the next step.";
const genericRecovery =
  "If an account exists for that email, password reset instructions have been sent.";

export async function register(_state: PublicAuthState, form: FormData): Promise<PublicAuthState> {
  const emailResult = validateEmail(form.get("email"));
  const passwordResult = validateNewPassword(form.get("password"), form.get("confirmPassword"));
  const fieldErrors = {
    ...(emailResult.email ? { email: emailResult.email } : {}),
    ...(!passwordResult.success ? passwordResult.errors : {}),
  };
  if (emailResult.email || !passwordResult.success)
    return { message: "Check the highlighted fields.", fieldErrors };
  const client = await getSupabaseServerClient();
  if (!client) return { message: "Authentication is not configured for this environment." };
  const { data, error } = await client.auth.signUp({
    email: emailResult.value!,
    password: passwordResult.password,
    options: { emailRedirectTo: `${trustedSiteUrl()}/auth/callback?flow=signup` },
  });
  if (error) return { message: "Unable to create an account right now. Please try again." };
  if (data.session) redirect("/onboarding");
  return { success: true, message: genericSignup };
}

export async function requestPasswordReset(
  _state: PublicAuthState,
  form: FormData,
): Promise<PublicAuthState> {
  const result = validateEmail(form.get("email"));
  if (result.email)
    return { message: "Check the highlighted field.", fieldErrors: { email: result.email } };
  const client = await getSupabaseServerClient();
  if (!client) return { message: "Authentication is not configured for this environment." };
  const state = randomBytes(32).toString("base64url");
  const store = await cookies();
  store.set("phoenix-recovery-state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  await client.auth.resetPasswordForEmail(result.value!, {
    redirectTo: `${trustedSiteUrl()}/auth/callback?flow=recovery&state=${encodeURIComponent(state)}`,
  });
  return { success: true, message: genericRecovery };
}

export async function updateRecoveredPassword(
  _state: PublicAuthState,
  form: FormData,
): Promise<PublicAuthState> {
  const result = validateNewPassword(form.get("password"), form.get("confirmPassword"));
  if (!result.success)
    return { message: "Check the highlighted fields.", fieldErrors: result.errors };
  const store = await cookies();
  if (store.get("phoenix-recovery-authorized")?.value !== "1")
    return { message: "This recovery link is invalid or has expired." };
  const client = await getSupabaseServerClient();
  if (!client || !(await client.auth.getUser()).data.user)
    return { message: "This recovery link is invalid or has expired." };
  const { error } = await client.auth.updateUser({ password: result.password });
  if (error) return { message: "Unable to update the password right now. Please try again." };
  await client.auth.signOut();
  store.delete("phoenix-recovery-authorized");
  store.delete("phoenix-recovery-state");
  redirect("/login?reset=success");
}
