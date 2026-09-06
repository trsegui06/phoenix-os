import Link from "next/link";

import type { TradingReview } from "@/domain/trading/trading-review";
import type { Trade } from "@/domain/trading/trade";
import type { TradingObjective } from "@/domain/trading/trading-objective";

type LinkedTrade = Trade & { pnlLabel: string | null };
type Props = { review: TradingReview; trades: LinkedTrade[]; objectives: TradingObjective[] };

const sections = [
  ["Review summary", "summary"],
  ["What worked", "strengths"],
  ["What needs work", "weaknesses"],
  ["Next actions", "actionPlan"],
] as const;

export function ReviewDetail({ review, trades, objectives }: Props) {
  return (
    <div className="space-y-7">
      <section aria-label="Review narrative" className="grid gap-4 md:grid-cols-2">
        {sections.map(([label, field]) => (
          <article
            key={field}
            className={`rounded-2xl border border-slate-800 bg-slate-900/45 p-5 sm:p-6 ${field === "summary" || field === "actionPlan" ? "md:col-span-2" : ""}`}
          >
            <h2 className="text-sm font-semibold tracking-[0.12em] text-slate-300 uppercase">
              {label}
            </h2>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-200">
              {review[field] ?? "Not recorded for this Review."}
            </p>
          </article>
        ))}
      </section>

      <section
        aria-labelledby="linked-trades-title"
        className="rounded-2xl border border-slate-800 bg-slate-900/45 p-5 sm:p-6"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="linked-trades-title" className="text-xl font-semibold text-white">
            Linked Trades
          </h2>
          <span className="text-sm text-slate-500">{trades.length}</span>
        </div>
        {trades.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {trades.map((trade) => (
              <li key={trade.id} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">
                <p className="font-medium text-white">
                  {trade.tradeDate} · {trade.asset}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {trade.direction} · {trade.result} · Risk{" "}
                  <span className="font-mono tabular-nums">
                    {trade.riskBasisPoints === null
                      ? "Unknown"
                      : `${(trade.riskBasisPoints / 100).toFixed(2)}%`}
                  </span>
                </p>
                {trade.pnlLabel && (
                  <p className="mt-2 font-mono font-semibold tabular-nums text-slate-200">
                    {trade.pnlLabel}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No Trades were linked to this Review.</p>
        )}
      </section>

      <section
        aria-labelledby="linked-objectives-title"
        className="rounded-2xl border border-slate-800 bg-slate-900/45 p-5 sm:p-6"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="linked-objectives-title" className="text-xl font-semibold text-white">
            Linked Objectives
          </h2>
          <span className="text-sm text-slate-500">{objectives.length}</span>
        </div>
        {objectives.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {objectives.map((objective) => (
              <li
                key={objective.id}
                className="rounded-xl border border-slate-800 bg-slate-950/35 p-4"
              >
                <p className="font-medium text-white">{objective.title}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {objective.status}
                  {objective.category ? ` · ${objective.category}` : ""}
                  {objective.targetDate ? ` · ${objective.targetDate}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No Objectives were linked to this Review.</p>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Link
          href="/trading/reviews"
          className="rounded-lg border border-slate-700 px-5 py-3 text-center font-medium text-slate-300 hover:border-slate-500 hover:text-white"
        >
          Back to Reviews
        </Link>
        <Link
          href={`/trading/reviews/${review.id}/edit`}
          className="rounded-lg bg-phoenix-orange px-5 py-3 text-center font-semibold text-slate-950"
        >
          Edit Review
        </Link>
      </div>
    </div>
  );
}
