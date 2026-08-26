import Link from "next/link";

import { ReviewForm } from "@/components/trading/reviews/review-form";
import { getReviewFormOptions } from "@/lib/trading/review-data";
import { getReviewPageClient } from "@/lib/trading/review-page";

export default async function NewReviewPage() {
  const options = await getReviewFormOptions(await getReviewPageClient());
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/trading/reviews" className="text-sm text-slate-400 hover:text-white">
        ← Reviews
      </Link>
      <header className="mt-5">
        <p className="text-xs font-semibold tracking-[0.18em] text-phoenix-orange uppercase">
          Structured reflection
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">New Review</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-400">
          Connect the period, evidence, learning, and next action in one durable artifact.
        </p>
      </header>
      <div className="mt-8">
        <ReviewForm {...options} />
      </div>
    </main>
  );
}
