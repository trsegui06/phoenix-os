import type { SupabaseClient } from "@supabase/supabase-js";
import { TradingReviewRepository } from "@/data/trading/trading-review-repository";
import {
  type CreateTradingReviewInput,
  TradingReviewValidationError,
  type UpdateTradingReviewInput,
  validateCreateTradingReview,
  validateUpdateTradingReview,
} from "@/domain/trading/trading-review";
import type { TradingReview } from "@/domain/trading/trading-review";
import { TradingApplicationError } from "./errors";

async function trader(client: SupabaseClient) {
  const { data: auth } = await client.auth.getUser();
  if (!auth.user)
    throw new TradingApplicationError("UNAUTHENTICATED", "Authentication is required.");
  const { data, error } = await client
    .from("traders")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (error)
    throw new TradingApplicationError("PERSISTENCE_ERROR", "Unable to resolve the Trader profile.");
  if (!data)
    throw new TradingApplicationError("TRADER_PROFILE_NOT_FOUND", "A Trader profile is required.");
  return String((data as { id: string }).id);
}
function fail(): never {
  throw new TradingApplicationError("PERSISTENCE_ERROR", "The Trading Review could not be saved.");
}
async function owned(
  client: SupabaseClient,
  table: "trades" | "objectives",
  ids: string[] | undefined,
) {
  if (!ids?.length) return;
  const { data, error } = await client.from(table).select("id").in("id", ids);
  if (error || data?.length !== ids.length) fail();
}
async function hydrate(
  repository: TradingReviewRepository,
  review: Omit<TradingReview, "tradeIds" | "objectiveIds">,
) {
  const links = await repository.readLinkedIds(review.id);
  if (links.error || !links.tradeIds || !links.objectiveIds) fail();
  return { ...review, tradeIds: links.tradeIds, objectiveIds: links.objectiveIds };
}
export async function createTradingReview(client: SupabaseClient, input: CreateTradingReviewInput) {
  try {
    const traderId = await trader(client),
      value = validateCreateTradingReview(input);
    await owned(client, "trades", value.tradeIds);
    await owned(client, "objectives", value.objectiveIds);
    const repository = new TradingReviewRepository(client),
      result = await repository.create(traderId, value);
    if (result.error || !result.review) fail();
    if (
      (value.tradeIds !== undefined &&
        (await repository.replaceTradeLinks(result.review.id, value.tradeIds)).error) ||
      (value.objectiveIds !== undefined &&
        (await repository.replaceObjectiveLinks(result.review.id, value.objectiveIds)).error)
    )
      fail();
    return hydrate(repository, result.review);
  } catch (error) {
    if (error instanceof TradingReviewValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}
export async function listTradingReviews(client: SupabaseClient) {
  await trader(client);
  const repository = new TradingReviewRepository(client),
    result = await repository.listForCurrentTrader();
  if (result.error || !result.reviews) fail();
  return Promise.all(result.reviews.map((review) => hydrate(repository, review)));
}
export async function getTradingReview(client: SupabaseClient, id: string) {
  await trader(client);
  const repository = new TradingReviewRepository(client),
    result = await repository.findByIdForCurrentTrader(id);
  if (result.error) fail();
  if (!result.review)
    throw new TradingApplicationError("TRADING_REVIEW_NOT_FOUND", "Trading Review not found.");
  return hydrate(repository, result.review);
}
export async function updateTradingReview(
  client: SupabaseClient,
  id: string,
  input: UpdateTradingReviewInput,
) {
  try {
    await trader(client);
    const value = validateUpdateTradingReview(input);
    await owned(client, "trades", value.tradeIds);
    await owned(client, "objectives", value.objectiveIds);
    const repository = new TradingReviewRepository(client),
      result = await repository.updateForCurrentTrader(id, value);
    if (result.error) fail();
    if (!result.review)
      throw new TradingApplicationError("TRADING_REVIEW_NOT_FOUND", "Trading Review not found.");
    if (
      (value.tradeIds !== undefined &&
        (await repository.replaceTradeLinks(id, value.tradeIds)).error) ||
      (value.objectiveIds !== undefined &&
        (await repository.replaceObjectiveLinks(id, value.objectiveIds)).error)
    )
      fail();
    return hydrate(repository, result.review);
  } catch (error) {
    if (error instanceof TradingReviewValidationError)
      throw new TradingApplicationError("VALIDATION_ERROR", error.message);
    throw error;
  }
}
