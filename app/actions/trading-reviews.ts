"use server";
import type {
  CreateTradingReviewInput,
  UpdateTradingReviewInput,
} from "@/domain/trading/trading-review";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradingApplicationError } from "@/services/trading/errors";
import {
  createTradingReview,
  getTradingReview,
  listTradingReviews,
  updateTradingReview,
} from "@/services/trading/trading-reviews";
async function c() {
  const x = await getSupabaseServerClient();
  if (!x) throw new TradingApplicationError("UNAUTHENTICATED", "Supabase is not configured.");
  return x;
}
export async function createTradingReviewAction(i: CreateTradingReviewInput) {
  return createTradingReview(await c(), i);
}
export async function listTradingReviewsAction() {
  return listTradingReviews(await c());
}
export async function getTradingReviewAction(id: string) {
  return getTradingReview(await c(), id);
}
export async function updateTradingReviewAction(id: string, i: UpdateTradingReviewInput) {
  return updateTradingReview(await c(), id, i);
}
