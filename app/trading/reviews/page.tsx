import Link from "next/link";

import { ReviewList } from "@/components/trading/reviews/review-list";
import { getReviewPageClient } from "@/lib/trading/review-page";
import { listTradingReviews } from "@/services/trading/trading-reviews";

export default async function ReviewsPage() {
  const reviews = await listTradingReviews(await getReviewPageClient());
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/trading" className="text-sm text-slate-400 hover:text-white">
        ← Trading Dashboard
      </Link>
      <header className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-phoenix-orange uppercase">
            Process before performance
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Trading Reviews</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-400">
            Revisit execution, preserve learning, and define the next disciplined action.
          </p>
        </div>
        <Link
          href="/trading/reviews/new"
          className="rounded-lg bg-phoenix-orange px-5 py-3 text-center font-semibold text-slate-950"
        >
          New Review
        </Link>
      </header>
      <div className="mt-8">
        <ReviewList reviews={reviews} />
      </div>
    </main>
  );
}
