import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { loadMessages, localeCookieName } from "./config";
import { resolveLocalePreference } from "./locale";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function authenticatedTraderLocale(): Promise<string | null> {
  const client = await getSupabaseServerClient();
  if (!client) return null;

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const { data } = await client
    .from("traders")
    .select("locale")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return data?.locale ?? null;
}

export default getRequestConfig(async () => {
  const [traderLocale, cookieStore, headerStore] = await Promise.all([
    authenticatedTraderLocale(),
    cookies(),
    headers(),
  ]);
  const locale = resolveLocalePreference({
    traderLocale,
    cookieLocale: cookieStore.get(localeCookieName)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
