import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateTradingReviewInput,
  TradingReview,
  UpdateTradingReviewInput,
} from "@/domain/trading/trading-review";
type R = Record<string, unknown>;
const c =
  "id,trader_id,review_type,period_start,period_end,summary,strengths,weaknesses,action_plan,created_at,updated_at";
const map = (r: R): Omit<TradingReview, "tradeIds" | "objectiveIds"> => ({
  id: String(r.id),
  traderId: String(r.trader_id),
  reviewType: String(r.review_type),
  periodStart: String(r.period_start),
  periodEnd: String(r.period_end),
  summary: r.summary ? String(r.summary) : null,
  strengths: r.strengths ? String(r.strengths) : null,
  weaknesses: r.weaknesses ? String(r.weaknesses) : null,
  actionPlan: r.action_plan ? String(r.action_plan) : null,
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});
const db = (i: CreateTradingReviewInput | UpdateTradingReviewInput): R => ({
  ...(i.reviewType !== undefined ? { review_type: i.reviewType } : {}),
  ...(i.periodStart !== undefined ? { period_start: i.periodStart } : {}),
  ...(i.periodEnd !== undefined ? { period_end: i.periodEnd } : {}),
  ...(i.summary !== undefined ? { summary: i.summary } : {}),
  ...(i.strengths !== undefined ? { strengths: i.strengths } : {}),
  ...(i.weaknesses !== undefined ? { weaknesses: i.weaknesses } : {}),
  ...(i.actionPlan !== undefined ? { action_plan: i.actionPlan } : {}),
});
export class TradingReviewRepository {
  constructor(private readonly client: SupabaseClient) {}
  async create(traderId: string, i: CreateTradingReviewInput) {
    const { data, error } = await this.client
      .from("reviews")
      .insert({ ...db(i), trader_id: traderId })
      .select(c)
      .single();
    return { review: data ? map(data as R) : null, error };
  }
  async listForCurrentTrader() {
    const { data, error } = await this.client
      .from("reviews")
      .select(c)
      .order("period_end", { ascending: false })
      .order("created_at", { ascending: false });
    return { reviews: data ? (data as R[]).map(map) : null, error };
  }
  async findByIdForCurrentTrader(id: string) {
    const { data, error } = await this.client.from("reviews").select(c).eq("id", id).maybeSingle();
    return { review: data ? map(data as R) : null, error };
  }
  async updateForCurrentTrader(id: string, i: UpdateTradingReviewInput) {
    const { data, error } = await this.client
      .from("reviews")
      .update({ ...db(i), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(c)
      .maybeSingle();
    return { review: data ? map(data as R) : null, error };
  }
  async readLinkedIds(reviewId: string) {
    const [a, b] = await Promise.all([
      this.client.from("review_trades").select("trade_id").eq("review_id", reviewId),
      this.client.from("review_objectives").select("objective_id").eq("review_id", reviewId),
    ]);
    return {
      tradeIds: a.data ? (a.data as R[]).map((x) => String(x.trade_id)) : null,
      objectiveIds: b.data ? (b.data as R[]).map((x) => String(x.objective_id)) : null,
      error: a.error || b.error,
    };
  }
  async replaceTradeLinks(reviewId: string, tradeIds: string[]) {
    const { error } = await this.client.rpc("replace_review_trade_links", {
      target_review_id: reviewId,
      target_trade_ids: [...new Set(tradeIds)],
    });
    return { error };
  }
  async replaceObjectiveLinks(reviewId: string, objectiveIds: string[]) {
    const { error } = await this.client.rpc("replace_review_objective_links", {
      target_review_id: reviewId,
      target_objective_ids: [...new Set(objectiveIds)],
    });
    return { error };
  }
}
