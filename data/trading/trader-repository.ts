import type { PhoenixSupabaseClient } from "@/lib/supabase/types";

export class TraderRepository {
  constructor(private readonly client: PhoenixSupabaseClient) {}

  async findForAuthUser(authUserId: string) {
    return this.client
      .from("traders")
      .select("id,name,timezone")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
  }

  async createForAuthUser(authUserId: string, input: { name: string; timezone: string }) {
    return this.client
      .from("traders")
      .insert({ auth_user_id: authUserId, name: input.name, timezone: input.timezone })
      .select("id,name,timezone")
      .single();
  }
}
