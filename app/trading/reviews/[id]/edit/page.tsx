import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/navigation/page-header";
import { ReviewForm } from "@/components/trading/reviews/review-form";
import { getReviewFormOptions } from "@/lib/trading/review-data";
import { getReviewPageClient } from "@/lib/trading/review-page";
import { TradingApplicationError } from "@/services/trading/errors";
import { getTradingReview } from "@/services/trading/trading-reviews";

export default async function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const client = await getReviewPageClient();
  let review;
  try {
    review = await getTradingReview(client, (await params).id);
  } catch (error) {
    if (error instanceof TradingApplicationError && error.code === "TRADING_REVIEW_NOT_FOUND")
      notFound();
    throw error;
  }
  const options = await getReviewFormOptions(client, review.tradeIds);
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
      <Link
        href={`/trading/reviews/${review.id}`}
        className="text-sm text-slate-400 hover:text-white"
      >
        ← Review Detail
      </Link>
      <div className="mt-5">
        <PageHeader
          eyebrow="Refine the learning"
          title="Edit Review"
          description="Update the narrative or replace linked evidence without changing historical Trades and Objectives."
        />
      </div>
      <div className="mt-8">
        <ReviewForm review={review} {...options} />
      </div>
    </main>
  );
}
