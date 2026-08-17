import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CreateTradingAccountInput,
  TradingAccount,
  UpdateTradingAccountInput,
} from "@/domain/trading/trading-account";
type Row = Record<string, unknown>;
const columns =
  "id,trader_id,prop_firm_id,broker,account_name,account_type,currency,initial_balance_cents,current_balance_cents,balance_updated_at,status,created_at,updated_at";
const cents = (value: unknown, field: string) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${field} exceeds safe integer precision.`);
  return parsed;
};
const map = (r: Row): TradingAccount => ({
  id: String(r.id),
  traderId: String(r.trader_id),
  propFirmId: r.prop_firm_id ? String(r.prop_firm_id) : null,
  broker: String(r.broker),
  accountName: String(r.account_name),
  accountType: String(r.account_type),
  currency: String(r.currency),
  initialBalanceCents: cents(r.initial_balance_cents, "initial_balance_cents"),
  currentBalanceCents:
    r.current_balance_cents === null
      ? null
      : cents(r.current_balance_cents, "current_balance_cents"),
  balanceUpdatedAt: r.balance_updated_at ? String(r.balance_updated_at) : null,
  status: String(r.status),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});
const db = (i: CreateTradingAccountInput | UpdateTradingAccountInput): Row => ({
  ...(i.propFirmId !== undefined ? { prop_firm_id: i.propFirmId } : {}),
  ...(i.broker !== undefined ? { broker: i.broker } : {}),
  ...(i.accountName !== undefined ? { account_name: i.accountName } : {}),
  ...(i.accountType !== undefined ? { account_type: i.accountType } : {}),
  ...(i.currency !== undefined ? { currency: i.currency } : {}),
  ...(i.initialBalanceCents !== undefined ? { initial_balance_cents: i.initialBalanceCents } : {}),
  ...(i.currentBalanceCents !== undefined ? { current_balance_cents: i.currentBalanceCents } : {}),
  ...(i.balanceUpdatedAt !== undefined ? { balance_updated_at: i.balanceUpdatedAt } : {}),
  ...(i.status !== undefined ? { status: i.status } : {}),
});
export class TradingAccountRepository {
  constructor(private readonly client: PhoenixSupabaseClient) {}
  async create(traderId: string, input: CreateTradingAccountInput) {
    const { data, error } = await this.client
      .from("trading_accounts")
      .insert({
        ...db(input),
        trader_id: traderId,
      } as Database["public"]["Tables"]["trading_accounts"]["Insert"])
      .select(columns)
      .single();
    return { account: data ? map(data as Row) : null, error };
  }
  async listForCurrentTrader() {
    const { data, error } = await this.client
      .from("trading_accounts")
      .select(columns)
      .order("created_at", { ascending: false });
    return { accounts: data ? (data as Row[]).map(map) : null, error };
  }
  async findByIdForCurrentTrader(id: string) {
    const { data, error } = await this.client
      .from("trading_accounts")
      .select(columns)
      .eq("id", id)
      .maybeSingle();
    return { account: data ? map(data as Row) : null, error };
  }
  async updateForCurrentTrader(id: string, input: UpdateTradingAccountInput) {
    const { data, error } = await this.client
      .from("trading_accounts")
      .update({ ...db(input), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(columns)
      .maybeSingle();
    return { account: data ? map(data as Row) : null, error };
  }
}
