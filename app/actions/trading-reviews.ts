"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  CreateTradingReviewInput,
  UpdateTradingReviewInput,
} from "@/domain/trading/trading-review";
import { parseReviewFormData, type ReviewFormState } from "@/lib/trading/review-form";
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

function safeReviewError(error: unknown): ReviewFormState {
  if (error instanceof TradingApplicationError) {
    if (error.code === "UNAUTHENTICATED") redirect("/login");
    if (error.code === "TRADER_PROFILE_NOT_FOUND") redirect("/onboarding");
    if (error.code === "VALIDATION_ERROR") return { message: error.message };
    if (error.code === "TRADING_REVIEW_NOT_FOUND")
      return { message: "This Review is no longer available." };
  }
  return { message: "The Review could not be saved. Your existing Review remains available." };
}

export async function saveTradingReviewFormAction(
  _state: ReviewFormState,
  form: FormData,
): Promise<ReviewFormState> {
  const reviewId = String(form.get("reviewId") ?? "");
  let destination = "/trading/reviews";
  try {
    const client = await c();
    const input = parseReviewFormData(form);
    const review = reviewId
      ? await updateTradingReview(client, reviewId, input)
      : await createTradingReview(client, input);
    revalidatePath("/trading");
    revalidatePath("/trading/reviews");
    revalidatePath(`/trading/reviews/${review.id}`);
    destination = `/trading/reviews/${review.id}?${reviewId ? "updated" : "created"}=1`;
  } catch (error) {
    return safeReviewError(error);
  }
  redirect(destination);
}
