"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adaptCreateAccountForm,
  adaptCreateSessionForm,
  adaptCreateSetupForm,
  adaptUpdateAccountForm,
  adaptUpdateSessionForm,
  adaptUpdateSetupForm,
  TradingSettingsFormError,
} from "@/lib/trading-settings";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradingApplicationError } from "@/services/trading/errors";
import { createTradingAccount, updateTradingAccount } from "@/services/trading/trading-accounts";
import { createTradingSession, updateTradingSession } from "@/services/trading/trading-sessions";
import { createTradingSetup, updateTradingSetup } from "@/services/trading/trading-setups";

async function client() {
  const result = await getSupabaseServerClient();
  if (!result) throw new TradingApplicationError("UNAUTHENTICATED", "Authentication is required.");
  return result;
}

function safeError(error: unknown) {
  if (error instanceof TradingSettingsFormError) return "validation";
  if (error instanceof TradingApplicationError) {
    if (error.code === "UNAUTHENTICATED") return "unauthenticated";
    if (error.code === "TRADER_PROFILE_NOT_FOUND") return "profile";
    if (error.code === "CONFLICT") return "conflict";
    if (error.code.endsWith("_NOT_FOUND")) return "not-found";
    if (error.code === "VALIDATION_ERROR") return "validation";
  }
  return "persistence";
}

function finish(marker: string) {
  revalidatePath("/trading/settings");
  revalidatePath("/trading/new");
  revalidatePath("/trading");
  redirect(`/trading/settings?success=${marker}`);
}

async function fail(error: unknown): Promise<never> {
  const marker = safeError(error);
  if (marker === "unauthenticated") redirect("/login");
  redirect(`/trading/settings?error=${marker}`);
}

export async function createAccountFormAction(form: FormData) {
  try {
    await createTradingAccount(await client(), adaptCreateAccountForm(form));
  } catch (error) {
    await fail(error);
  }
  finish("account-created");
}

export async function updateAccountFormAction(form: FormData) {
  try {
    await updateTradingAccount(
      await client(),
      String(form.get("id") ?? ""),
      adaptUpdateAccountForm(form),
    );
  } catch (error) {
    await fail(error);
  }
  finish("account-updated");
}

export async function createSessionFormAction(form: FormData) {
  try {
    await createTradingSession(await client(), adaptCreateSessionForm(form));
  } catch (error) {
    await fail(error);
  }
  finish("session-created");
}

export async function updateSessionFormAction(form: FormData) {
  try {
    await updateTradingSession(
      await client(),
      String(form.get("id") ?? ""),
      adaptUpdateSessionForm(form),
    );
  } catch (error) {
    await fail(error);
  }
  finish("session-updated");
}

export async function createSetupFormAction(form: FormData) {
  try {
    await createTradingSetup(await client(), adaptCreateSetupForm(form));
  } catch (error) {
    await fail(error);
  }
  finish("setup-created");
}

export async function updateSetupFormAction(form: FormData) {
  try {
    await updateTradingSetup(
      await client(),
      String(form.get("id") ?? ""),
      adaptUpdateSetupForm(form),
    );
  } catch (error) {
    await fail(error);
  }
  finish("setup-updated");
}
