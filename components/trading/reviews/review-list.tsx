import Link from "next/link";

import type { TradingReview } from "@/domain/trading/trading-review";

export function ReviewList({ reviews }: { reviews: TradingReview[] }) {
  if (!reviews.length)
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-12 text-center sm:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-phoenix-orange uppercase">
          Learning starts here
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Your Reviews turn trading activity into learning.
        </h2>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
          Create a calm record of what worked, what needs attention, and what you will carry into
          the next period.
        </p>
        <Link
          href="/trading/reviews/new"
          className="mt-6 inline-flex rounded-lg bg-phoenix-orange px-5 py-3 font-semibold text-slate-950"
        >
          Create first Review
        </Link>
      </section>
    );

  return (
    <ol className="grid gap-4">
      {reviews.map((review) => (
        <li key={review.id}>
          <Link
            href={`/trading/reviews/${review.id}`}
            className="group block rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-slate-700 hover:bg-slate-900/75 sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.16em] text-phoenix-orange uppercase">
                  {review.reviewType}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white group-hover:text-orange-100">
                  {review.periodStart} → {review.periodEnd}
                </h2>
                <p className="mt-3 line-clamp-2 leading-7 text-slate-400">
                  {review.summary ?? "No summary recorded yet."}
                </p>
              </div>
              <dl className="flex shrink-0 gap-5 text-sm">
                <div>
                  <dt className="text-slate-500">Trades</dt>
                  <dd className="mt-1 font-semibold text-white">{review.tradeIds.length}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Objectives</dt>
                  <dd className="mt-1 font-semibold text-white">{review.objectiveIds.length}</dd>
                </div>
              </dl>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
