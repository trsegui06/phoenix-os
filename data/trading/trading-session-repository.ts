import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CreateTradingSessionInput,
  TradingSession,
  UpdateTradingSessionInput,
} from "@/domain/trading/trading-session";
type R = Record<string, unknown>;
const c =
  "id,trader_id,session_date,session_type,market_bias,emotional_state,notes,creation_source,creation_import_batch_id,created_at,updated_at";
const map = (r: R): TradingSession => ({
  id: String(r.id),
  traderId: String(r.trader_id),
  sessionDate: String(r.session_date),
  sessionType: String(r.session_type),
  marketBias: r.market_bias ? String(r.market_bias) : null,
  emotionalState: r.emotional_state ? String(r.emotional_state) : null,
  notes: r.notes ? String(r.notes) : null,
  creationSource: String(r.creation_source) as "manual" | "historical_import",
  creationImportBatchId: r.creation_import_batch_id ? String(r.creation_import_batch_id) : null,
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});
const db = (i: CreateTradingSessionInput | UpdateTradingSessionInput): R => ({
  ...(i.sessionDate !== undefined ? { session_date: i.sessionDate } : {}),
  ...(i.sessionType !== undefined ? { session_type: i.sessionType } : {}),
  ...(i.marketBias !== undefined ? { market_bias: i.marketBias } : {}),
  ...(i.emotionalState !== undefined ? { emotional_state: i.emotionalState } : {}),
  ...(i.notes !== undefined ? { notes: i.notes } : {}),
});
export class TradingSessionRepository {
  constructor(private readonly client: PhoenixSupabaseClient) {}
  async create(traderId: string, i: CreateTradingSessionInput) {
    const { data, error } = await this.client
      .from("sessions")
      .insert({
        ...db(i),
        trader_id: traderId,
      } as Database["public"]["Tables"]["sessions"]["Insert"])
      .select(c)
      .single();
    return { session: data ? map(data as R) : null, error };
  }
  async listForCurrentTrader() {
    const { data, error } = await this.client
      .from("sessions")
      .select(c)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false });
    return { sessions: data ? (data as R[]).map(map) : null, error };
  }
  async listByDatesForCurrentTrader(dates: string[]) {
    const { data, error } = await this.client
      .from("sessions")
      .select(c)
      .in("session_date", dates)
      .order("session_date", { ascending: true })
      .order("created_at", { ascending: true });
    return { sessions: data ? (data as R[]).map(map) : null, error };
  }
  async resolveHistoricalImport(input: {
    dates: string[];
    sessionType: string;
    importBatchId: string;
    selectedSessionIdsByDate: Record<string, string>;
  }) {
    const { data, error } = await this.client.rpc("resolve_historical_import_sessions", {
      target_dates: input.dates,
      target_session_type: input.sessionType,
      target_import_batch_id: input.importBatchId,
      target_selected_session_ids: input.selectedSessionIdsByDate,
    });
    return { rows: data, error };
  }
  async findByIdForCurrentTrader(id: string) {
    const { data, error } = await this.client.from("sessions").select(c).eq("id", id).maybeSingle();
    return { session: data ? map(data as R) : null, error };
  }
  async updateForCurrentTrader(id: string, i: UpdateTradingSessionInput) {
    const { data, error } = await this.client
      .from("sessions")
      .update({ ...db(i), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(c)
      .maybeSingle();
    return { session: data ? map(data as R) : null, error };
  }
}
