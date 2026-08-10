import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateTradingSetupInput,
  TradingSetup,
  UpdateTradingSetupInput,
} from "@/domain/trading/trading-setup";

type Row = Record<string, unknown>;

const columns =
  "id,trader_id,name,timeframe,market_condition,entry_rules,exit_rules,validation_rules,created_at,updated_at";

const map = (row: Row): TradingSetup => ({
  id: String(row.id),
  traderId: String(row.trader_id),
  name: String(row.name),
  timeframe: String(row.timeframe),
  marketCondition: row.market_condition ? String(row.market_condition) : null,
  entryRules: String(row.entry_rules),
  exitRules: String(row.exit_rules),
  validationRules: String(row.validation_rules),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const db = (input: CreateTradingSetupInput | UpdateTradingSetupInput): Row => ({
  ...(input.name !== undefined ? { name: input.name } : {}),
  ...(input.timeframe !== undefined ? { timeframe: input.timeframe } : {}),
  ...(input.marketCondition !== undefined ? { market_condition: input.marketCondition } : {}),
  ...(input.entryRules !== undefined ? { entry_rules: input.entryRules } : {}),
  ...(input.exitRules !== undefined ? { exit_rules: input.exitRules } : {}),
  ...(input.validationRules !== undefined ? { validation_rules: input.validationRules } : {}),
});

export class TradingSetupRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(traderId: string, input: CreateTradingSetupInput) {
    const { data, error } = await this.client
      .from("setups")
      .insert({ ...db(input), trader_id: traderId })
      .select(columns)
      .single();
    return { setup: data ? map(data as Row) : null, error };
  }

  async listForCurrentTrader() {
    const { data, error } = await this.client
      .from("setups")
      .select(columns)
      .order("name", { ascending: true })
      .order("created_at", { ascending: true });
    return { setups: data ? (data as Row[]).map(map) : null, error };
  }

  async findByIdForCurrentTrader(id: string) {
    const { data, error } = await this.client
      .from("setups")
      .select(columns)
      .eq("id", id)
      .maybeSingle();
    return { setup: data ? map(data as Row) : null, error };
  }

  async updateForCurrentTrader(id: string, input: UpdateTradingSetupInput) {
    const { data, error } = await this.client
      .from("setups")
      .update({ ...db(input), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(columns)
      .maybeSingle();
    return { setup: data ? map(data as Row) : null, error };
  }
}
