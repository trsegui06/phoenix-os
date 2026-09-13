"use server";

import { redirect } from "next/navigation";

import { validateLoginCredentials } from "@/lib/auth/login";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasCurrentTrader } from "@/services/trading/trader-provisioning";
import { validationMessages, type PresentationMessage } from "@/i18n/presentation";

export type LoginActionState = {
  message?: PresentationMessage;
  fieldErrors?: { email?: PresentationMessage; password?: PresentationMessage };
};

export async function login(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const result = validateLoginCredentials(formData.get("email"), formData.get("password"));

  if (!result.success) {
    return {
      message: { key: "validation.checkFields" },
      fieldErrors: validationMessages(result.fieldErrors),
    };
  }

  const client = await getSupabaseServerClient();
  if (!client) {
    return { message: { key: "auth.notConfigured" } };
  }

  const { error } = await client.auth.signInWithPassword(result.data);
  if (error) {
    return {
      message: {
        key:
          error.code === "invalid_credentials"
            ? "auth.invalidCredentials"
            : "auth.signInUnavailable",
      },
    };
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
