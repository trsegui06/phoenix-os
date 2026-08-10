import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateTradeInput, Trade, UpdateTradeInput } from "@/domain/trading/trade";

type Row = Record<string, unknown>;

const columns =
  "id,trader_id,session_id,setup_id,trading_account_id,trade_date,asset,direction,entry_price,stop_loss,take_profit,exit_price,risk_basis_points,position_size,result,pnl_cents,execution_quality,screenshots,notes,created_at,updated_at";

function numeric(value: unknown, field: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} has an invalid database value.`);
  return parsed;
}

function cents(value: unknown) {
  if (value === null) return null;
  const parsed = numeric(value, "pnl_cents");
  if (!Number.isSafeInteger(parsed)) throw new Error("pnl_cents exceeds safe integer precision.");
  return parsed;
}

const map = (row: Row): Trade => ({
  id: String(row.id),
  traderId: String(row.trader_id),
  sessionId: String(row.session_id),
  setupId: String(row.setup_id),
  tradingAccountId: String(row.trading_account_id),
  tradeDate: String(row.trade_date),
  asset: String(row.asset),
  direction: String(row.direction) as Trade["direction"],
  entryPrice: numeric(row.entry_price, "entry_price"),
  stopLoss: numeric(row.stop_loss, "stop_loss"),
  takeProfit: numeric(row.take_profit, "take_profit"),
  exitPrice: row.exit_price === null ? null : numeric(row.exit_price, "exit_price"),
  riskBasisPoints: numeric(row.risk_basis_points, "risk_basis_points"),
  positionSize: numeric(row.position_size, "position_size"),
  result: String(row.result),
  pnlCents: cents(row.pnl_cents),
  executionQuality: row.execution_quality ? String(row.execution_quality) : null,
  screenshots: Array.isArray(row.screenshots) ? row.screenshots.map(String) : [],
  notes: row.notes ? String(row.notes) : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const db = (input: CreateTradeInput | UpdateTradeInput): Row => ({
  ...(input.sessionId !== undefined ? { session_id: input.sessionId } : {}),
  ...(input.setupId !== undefined ? { setup_id: input.setupId } : {}),
  ...(input.tradingAccountId !== undefined ? { trading_account_id: input.tradingAccountId } : {}),
  ...(input.tradeDate !== undefined ? { trade_date: input.tradeDate } : {}),
  ...(input.asset !== undefined ? { asset: input.asset } : {}),
  ...(input.direction !== undefined ? { direction: input.direction } : {}),
  ...(input.entryPrice !== undefined ? { entry_price: input.entryPrice } : {}),
  ...(input.stopLoss !== undefined ? { stop_loss: input.stopLoss } : {}),
  ...(input.takeProfit !== undefined ? { take_profit: input.takeProfit } : {}),
  ...(input.exitPrice !== undefined ? { exit_price: input.exitPrice } : {}),
  ...(input.riskBasisPoints !== undefined ? { risk_basis_points: input.riskBasisPoints } : {}),
  ...(input.positionSize !== undefined ? { position_size: input.positionSize } : {}),
  ...(input.result !== undefined ? { result: input.result } : {}),
  ...(input.pnlCents !== undefined ? { pnl_cents: input.pnlCents } : {}),
  ...(input.executionQuality !== undefined ? { execution_quality: input.executionQuality } : {}),
  ...(input.screenshots !== undefined ? { screenshots: input.screenshots } : {}),
  ...(input.notes !== undefined ? { notes: input.notes } : {}),
});

export class TradeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(traderId: string, input: CreateTradeInput) {
    const { data, error } = await this.client
      .from("trades")
      .insert({ ...db(input), trader_id: traderId })
      .select(columns)
      .single();
    return { trade: data ? map(data as Row) : null, error };
  }

  async listForCurrentTrader() {
    const { data, error } = await this.client
      .from("trades")
      .select(columns)
      .order("trade_date", { ascending: false })
      .order("created_at", { ascending: false });
    return { trades: data ? (data as Row[]).map(map) : null, error };
  }

  async findByIdForCurrentTrader(id: string) {
    const { data, error } = await this.client
      .from("trades")
      .select(columns)
      .eq("id", id)
      .maybeSingle();
    return { trade: data ? map(data as Row) : null, error };
  }

  async updateForCurrentTrader(id: string, input: UpdateTradeInput) {
    const { data, error } = await this.client
      .from("trades")
      .update({ ...db(input), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(columns)
      .maybeSingle();
    return { trade: data ? map(data as Row) : null, error };
  }
}
