import Link from "next/link";

import { PageHeader } from "@/components/navigation/page-header";
import { ReviewForm } from "@/components/trading/reviews/review-form";
import { getReviewFormOptions } from "@/lib/trading/review-data";
import { getReviewPageClient } from "@/lib/trading/review-page";

export default async function NewReviewPage() {
  const options = await getReviewFormOptions(await getReviewPageClient());
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
      <Link href="/trading/reviews" className="text-sm text-slate-400 hover:text-white">
        ← Reviews
      </Link>
      <div className="mt-5">
        <PageHeader
          eyebrow="Structured reflection"
          title="New Review"
          description="Connect the period, evidence, learning, and next action in one durable artifact."
        />
      </div>
      <div className="mt-8">
        <ReviewForm {...options} />
      </div>
    </main>
  );
}
