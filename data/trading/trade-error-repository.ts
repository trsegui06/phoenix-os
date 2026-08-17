import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CreateTradeErrorInput,
  TradeError,
  UpdateTradeErrorInput,
} from "@/domain/trading/trade-error";

type Row = Record<string, unknown>;

const columns = "id,trade_id,category,severity,description,solution,created_at,updated_at";

const map = (row: Row): TradeError => ({
  id: String(row.id),
  tradeId: String(row.trade_id),
  category: String(row.category),
  severity: String(row.severity),
  description: String(row.description),
  solution: row.solution ? String(row.solution) : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const db = (input: CreateTradeErrorInput | UpdateTradeErrorInput): Row => ({
  ...("tradeId" in input ? { trade_id: input.tradeId } : {}),
  ...(input.category !== undefined ? { category: input.category } : {}),
  ...(input.severity !== undefined ? { severity: input.severity } : {}),
  ...(input.description !== undefined ? { description: input.description } : {}),
  ...(input.solution !== undefined ? { solution: input.solution } : {}),
});

export class TradeErrorRepository {
  constructor(private readonly client: PhoenixSupabaseClient) {}

  async create(input: CreateTradeErrorInput) {
    const { data, error } = await this.client
      .from("trade_errors")
      .insert(db(input) as Database["public"]["Tables"]["trade_errors"]["Insert"])
      .select(columns)
      .single();
    return { tradeError: data ? map(data as Row) : null, error };
  }

  async listForCurrentTrader() {
    const { data, error } = await this.client
      .from("trade_errors")
      .select(columns)
      .order("created_at", { ascending: false });
    return { tradeErrors: data ? (data as Row[]).map(map) : null, error };
  }

  async findByIdForCurrentTrader(id: string) {
    const { data, error } = await this.client
      .from("trade_errors")
      .select(columns)
      .eq("id", id)
      .maybeSingle();
    return { tradeError: data ? map(data as Row) : null, error };
  }

  async updateForCurrentTrader(id: string, input: UpdateTradeErrorInput) {
    const { data, error } = await this.client
      .from("trade_errors")
      .update({ ...db(input), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(columns)
      .maybeSingle();
    return { tradeError: data ? map(data as Row) : null, error };
  }
}
