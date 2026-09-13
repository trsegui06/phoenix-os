"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { trustedSiteUrl, validateEmail, validateNewPassword } from "@/lib/auth/public-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  validationMessage,
  validationMessages,
  type PresentationMessage,
} from "@/i18n/presentation";

export type PublicAuthState = {
  message?: PresentationMessage;
  success?: boolean;
  fieldErrors?: {
    email?: PresentationMessage;
    password?: PresentationMessage;
    confirmPassword?: PresentationMessage;
  };
};

export async function register(_state: PublicAuthState, form: FormData): Promise<PublicAuthState> {
  const emailResult = validateEmail(form.get("email"));
  const passwordResult = validateNewPassword(form.get("password"), form.get("confirmPassword"));
  const fieldErrors = {
    ...(emailResult.email ? { email: emailResult.email } : {}),
    ...(!passwordResult.success ? passwordResult.errors : {}),
  };
  if (emailResult.email || !passwordResult.success)
    return {
      message: { key: "validation.checkFields" },
      fieldErrors: validationMessages(fieldErrors),
    };
  const client = await getSupabaseServerClient();
  if (!client) return { message: { key: "auth.notConfigured" } };
  const { data, error } = await client.auth.signUp({
    email: emailResult.value!,
    password: passwordResult.password,
    options: { emailRedirectTo: `${trustedSiteUrl()}/auth/callback?flow=signup` },
  });
  if (error) return { message: { key: "auth.registerUnavailable" } };
  if (data.session) redirect("/onboarding");
  return { success: true, message: { key: "auth.genericSignup" } };
}

export async function requestPasswordReset(
  _state: PublicAuthState,
  form: FormData,
): Promise<PublicAuthState> {
  const result = validateEmail(form.get("email"));
  if (result.email)
    return {
      message: { key: "validation.checkField" },
      fieldErrors: { email: validationMessage(result.email) },
    };
  const client = await getSupabaseServerClient();
  if (!client) return { message: { key: "auth.notConfigured" } };
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
  return { success: true, message: { key: "auth.genericRecovery" } };
}

export async function updateRecoveredPassword(
  _state: PublicAuthState,
  form: FormData,
): Promise<PublicAuthState> {
  const result = validateNewPassword(form.get("password"), form.get("confirmPassword"));
  if (!result.success)
    return {
      message: { key: "validation.checkFields" },
      fieldErrors: validationMessages(result.errors),
    };
  const store = await cookies();
  if (store.get("phoenix-recovery-authorized")?.value !== "1")
    return { message: { key: "auth.invalidRecoveryLink" } };
  const client = await getSupabaseServerClient();
  if (!client || !(await client.auth.getUser()).data.user)
    return { message: { key: "auth.invalidRecoveryLink" } };
  const { error } = await client.auth.updateUser({ password: result.password });
  if (error) return { message: { key: "auth.passwordUpdateUnavailable" } };
  await client.auth.signOut();
  store.delete("phoenix-recovery-authorized");
  store.delete("phoenix-recovery-state");
  redirect("/login?reset=success");
}
