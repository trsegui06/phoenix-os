import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import type { Locale } from "@/i18n/config";

export class TraderRepository {
  constructor(private readonly client: PhoenixSupabaseClient) {}

  async findForAuthUser(authUserId: string) {
    return this.client
      .from("traders")
      .select("id,name,timezone,locale")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
  }

  async createForAuthUser(
    authUserId: string,
    input: { name: string; timezone: string; locale: Locale },
  ) {
    return this.client
      .from("traders")
      .insert({ auth_user_id: authUserId, name: input.name, timezone: input.timezone })
      .select("id,name,timezone,locale")
      .single();
  }

  async updateLocaleForAuthUser(authUserId: string, locale: Locale) {
    return this.client
      .from("traders")
      .update({ locale })
      .eq("auth_user_id", authUserId)
      .select("locale")
      .single();
  }
}
