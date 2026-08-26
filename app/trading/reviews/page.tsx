import Link from "next/link";

import { PageHeader } from "@/components/navigation/page-header";
import { ReviewList } from "@/components/trading/reviews/review-list";
import { getReviewPageClient } from "@/lib/trading/review-page";
import { listTradingReviews } from "@/services/trading/trading-reviews";

export default async function ReviewsPage() {
  const reviews = await listTradingReviews(await getReviewPageClient());
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
      <PageHeader
        eyebrow="Process before performance"
        title="Trading Reviews"
        description="Revisit execution, preserve learning, and define the next disciplined action."
        action={
          <Link
            href="/trading/reviews/new"
            className="inline-flex min-h-11 items-center rounded-lg bg-phoenix-orange px-5 py-3 text-center font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange"
          >
            New Review
          </Link>
        }
      />
      <div className="mt-8">
        <ReviewList reviews={reviews} />
      </div>
    </main>
  );
}
