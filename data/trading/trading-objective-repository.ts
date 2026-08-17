import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CreateTradingObjectiveInput,
  TradingObjective,
  UpdateTradingObjectiveInput,
} from "@/domain/trading/trading-objective";

type Row = Record<string, unknown>;

const columns = "id,trader_id,title,description,category,target_date,status,created_at,updated_at";

const map = (row: Row): TradingObjective => ({
  id: String(row.id),
  traderId: String(row.trader_id),
  title: String(row.title),
  description: row.description ? String(row.description) : null,
  category: row.category ? String(row.category) : null,
  targetDate: row.target_date ? String(row.target_date) : null,
  status: String(row.status),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const db = (input: CreateTradingObjectiveInput | UpdateTradingObjectiveInput): Row => ({
  ...(input.title !== undefined ? { title: input.title } : {}),
  ...(input.description !== undefined ? { description: input.description } : {}),
  ...(input.category !== undefined ? { category: input.category } : {}),
  ...(input.targetDate !== undefined ? { target_date: input.targetDate } : {}),
  ...(input.status !== undefined ? { status: input.status } : {}),
});

export class TradingObjectiveRepository {
  constructor(private readonly client: PhoenixSupabaseClient) {}

  async create(traderId: string, input: CreateTradingObjectiveInput) {
    const { data, error } = await this.client
      .from("objectives")
      .insert({
        ...db(input),
        trader_id: traderId,
      } as Database["public"]["Tables"]["objectives"]["Insert"])
      .select(columns)
      .single();
    return { objective: data ? map(data as Row) : null, error };
  }

  async listForCurrentTrader() {
    const { data, error } = await this.client
      .from("objectives")
      .select(columns)
      .order("target_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    return { objectives: data ? (data as Row[]).map(map) : null, error };
  }

  async findByIdForCurrentTrader(id: string) {
    const { data, error } = await this.client
      .from("objectives")
      .select(columns)
      .eq("id", id)
      .maybeSingle();
    return { objective: data ? map(data as Row) : null, error };
  }

  async updateForCurrentTrader(id: string, input: UpdateTradingObjectiveInput) {
    const { data, error } = await this.client
      .from("objectives")
      .update({ ...db(input), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(columns)
      .maybeSingle();
    return { objective: data ? map(data as Row) : null, error };
  }
}
