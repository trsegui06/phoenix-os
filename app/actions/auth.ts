"use server";

import { redirect } from "next/navigation";

import { mapAuthenticationError, validateLoginCredentials } from "@/lib/auth/login";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasCurrentTrader } from "@/services/trading/trader-provisioning";

export type LoginActionState = {
  message?: string;
  fieldErrors?: { email?: string; password?: string };
};

export async function login(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const result = validateLoginCredentials(formData.get("email"), formData.get("password"));

  if (!result.success) {
    return { message: "Check the highlighted fields.", fieldErrors: result.fieldErrors };
  }

  const client = await getSupabaseServerClient();
  if (!client) {
    return { message: "Authentication is not configured for this environment." };
  }

  const { error } = await client.auth.signInWithPassword(result.data);
  if (error) {
    return { message: mapAuthenticationError(error.code) };
  }

  redirect((await hasCurrentTrader(client)) ? "/trading" : "/onboarding");
}

export async function logout(): Promise<never> {
  const client = await getSupabaseServerClient();
  if (client) {
    await client.auth.signOut();
  }

  redirect("/login");
}
