"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  adaptCreateAccountForm,
  adaptCreateSessionForm,
  adaptCreateSetupForm,
  TradingSettingsFormError,
} from "@/lib/trading-settings";
import { TradingApplicationError } from "@/services/trading/errors";
import { provisionCurrentTrader } from "@/services/trading/trader-provisioning";
import { createTradingAccount, listTradingAccounts } from "@/services/trading/trading-accounts";
import { createTradingSession, listTradingSessions } from "@/services/trading/trading-sessions";
import { createTradingSetup, listTradingSetups } from "@/services/trading/trading-setups";

export type OnboardingState = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

async function onboardingClient() {
  const client = await getSupabaseServerClient();
  if (!client) redirect("/login");
  return client;
}

function validationState(error: unknown, fallback: string): OnboardingState {
  if (error instanceof TradingSettingsFormError) {
    const field = /balance/i.test(error.message)
      ? "initialBalance"
      : error.message.match(/^(\w+)/)?.[1];
    return {
      message: "Check the highlighted fields.",
      fieldErrors: field ? { [field]: error.message } : undefined,
    };
  }
  if (error instanceof TradingApplicationError) {
    if (error.code === "UNAUTHENTICATED") redirect("/login");
    if (error.code === "TRADER_PROFILE_NOT_FOUND") redirect("/onboarding");
    if (error.code === "VALIDATION_ERROR") {
      const field = error.message.match(/^(\w+)/)?.[1];
      return {
        message: "Check the highlighted fields.",
        fieldErrors: field ? { [field]: error.message } : undefined,
      };
    }
    if (error.code === "CONFLICT") return { message: error.message };
  }
  return { message: fallback };
}

export async function provisionTraderAction(
  _state: OnboardingState,
  form: FormData,
): Promise<OnboardingState> {
  const client = await onboardingClient();
  try {
    await provisionCurrentTrader(client, {
      name: String(form.get("name") ?? ""),
      timezone: String(form.get("timezone") ?? ""),
      locale: await getLocale(),
    });
  } catch (error) {
    if (error instanceof TradingApplicationError) {
      if (error.code === "UNAUTHENTICATED") redirect("/login");
      if (error.code === "CONFLICT") redirect("/trading");
      if (error.code === "VALIDATION_ERROR") {
        const field = error.message.toLowerCase().includes("timezone") ? "timezone" : "name";
        return {
          message: "Check the highlighted fields.",
          fieldErrors: { [field]: error.message },
        };
      }
    }
    return { message: "Your trading workspace could not be created. Try again." };
  }
  revalidatePath("/trading");
  revalidatePath("/trading/settings");
  revalidatePath("/trading/new");
  redirect("/onboarding");
}

export async function createFirstAccountAction(
  _state: OnboardingState,
  form: FormData,
): Promise<OnboardingState> {
  const client = await onboardingClient();
  try {
    if (!(await listTradingAccounts(client)).length)
      await createTradingAccount(client, adaptCreateAccountForm(form));
  } catch (error) {
    return validationState(error, "Your first Trading Account could not be created. Try again.");
  }
  revalidatePath("/onboarding");
  revalidatePath("/trading/settings");
  revalidatePath("/trading/new");
  redirect("/onboarding");
}

export async function configureTradingEnvironmentAction(
  _state: OnboardingState,
  form: FormData,
): Promise<OnboardingState> {
  const client = await onboardingClient();
  try {
    const [sessions, setups] = await Promise.all([
      listTradingSessions(client),
      listTradingSetups(client),
    ]);
    if (!sessions.length) await createTradingSession(client, adaptCreateSessionForm(form));
    if (!setups.length) await createTradingSetup(client, adaptCreateSetupForm(form));
  } catch (error) {
    return validationState(error, "Your trading environment could not be configured. Try again.");
  }
  revalidatePath("/onboarding");
  revalidatePath("/trading/settings");
  revalidatePath("/trading/new");
  revalidatePath("/trading");
  redirect("/onboarding?step=complete");
}
