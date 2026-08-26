import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/navigation/page-header";
import { ReviewDetail } from "@/components/trading/reviews/review-detail";
import { getReviewLinkedData } from "@/lib/trading/review-data";
import { getReviewPageClient } from "@/lib/trading/review-page";
import { TradingApplicationError } from "@/services/trading/errors";
import { getTradingReview } from "@/services/trading/trading-reviews";

export default async function ReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const client = await getReviewPageClient();
  let review;
  try {
    review = await getTradingReview(client, (await params).id);
  } catch (error) {
    if (error instanceof TradingApplicationError && error.code === "TRADING_REVIEW_NOT_FOUND")
      notFound();
    throw error;
  }
  const linked = await getReviewLinkedData(client, review.tradeIds, review.objectiveIds);
  const state = await searchParams;
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
      <Link href="/trading/reviews" className="text-sm text-slate-400 hover:text-white">
        ← Reviews
      </Link>
      <div className="mt-5">
        <PageHeader
          eyebrow={review.reviewType}
          title={`${review.periodStart} → ${review.periodEnd}`}
          description="A structured record of execution, learning, and the next disciplined action."
        />
      </div>
      {(state.created || state.updated) && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200"
        >
          Review {state.created ? "created" : "updated"} successfully.
        </p>
      )}
      <div className="mt-8">
        <ReviewDetail review={review} {...linked} />
      </div>
    </main>
  );
}
