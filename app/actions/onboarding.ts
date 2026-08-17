"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradingApplicationError } from "@/services/trading/errors";
import { provisionCurrentTrader } from "@/services/trading/trader-provisioning";

export type OnboardingState = {
  message?: string;
  fieldErrors?: { name?: string; timezone?: string };
};

export async function provisionTraderAction(
  _state: OnboardingState,
  form: FormData,
): Promise<OnboardingState> {
  const client = await getSupabaseServerClient();
  if (!client) redirect("/login");
  try {
    await provisionCurrentTrader(client, {
      name: String(form.get("name") ?? ""),
      timezone: String(form.get("timezone") ?? ""),
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
  redirect("/trading/settings");
}
