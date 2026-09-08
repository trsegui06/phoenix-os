"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isLocale, localeCookieName, type Locale } from "@/i18n/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradingApplicationError } from "@/services/trading/errors";
import { updateCurrentTraderLocale } from "@/services/trading/trader-provisioning";

export type LocaleActionState = {
  locale?: Locale;
  error?: "invalid" | "persistence";
};

export async function updateLocaleAction(
  _state: LocaleActionState,
  form: FormData,
): Promise<LocaleActionState> {
  const requestedLocale = form.get("locale");
  if (!isLocale(requestedLocale)) return { error: "invalid" };

  const client = await getSupabaseServerClient();
  if (!client) redirect("/login");

  try {
    const locale = await updateCurrentTraderLocale(client, requestedLocale);
    (await cookies()).set(localeCookieName, locale, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    revalidatePath("/", "layout");
    return { locale };
  } catch (error) {
    if (error instanceof TradingApplicationError && error.code === "UNAUTHENTICATED") {
      redirect("/login");
    }
    if (error instanceof TradingApplicationError && error.code === "TRADER_PROFILE_NOT_FOUND") {
      redirect("/onboarding");
    }
    return { error: "persistence" };
  }
}
