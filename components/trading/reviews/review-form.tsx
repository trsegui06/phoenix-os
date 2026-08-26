"use client";

import { useActionState, useMemo, useState } from "react";

import { saveTradingReviewFormAction } from "@/app/actions/trading-reviews";
import type { TradingReview } from "@/domain/trading/trading-review";
import type { ReviewFormState } from "@/lib/trading/review-form";

export type ReviewTradeOption = {
  id: string;
  tradeDate: string;
  asset: string;
  direction: string;
  result: string;
  pnlLabel: string | null;
};
export type ReviewObjectiveOption = {
  id: string;
  title: string;
  status: string;
  category: string | null;
  targetDate: string | null;
};

type Props = {
  review?: TradingReview;
  trades: ReviewTradeOption[];
  objectives: ReviewObjectiveOption[];
};

const initialState: ReviewFormState = {};
const fieldClass =
  "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white focus:border-phoenix-orange focus:outline-none";

export function ReviewForm({ review, trades, objectives }: Props) {
  const [state, action, pending] = useActionState(saveTradingReviewFormAction, initialState);
  const [periodStart, setPeriodStart] = useState(review?.periodStart ?? "");
  const [periodEnd, setPeriodEnd] = useState(review?.periodEnd ?? "");
  const [selectedTrades, setSelectedTrades] = useState(review?.tradeIds ?? []);
  const visibleTrades = useMemo(
    () =>
      trades.filter(
        (trade) =>
          selectedTrades.includes(trade.id) ||
          ((!periodStart || trade.tradeDate >= periodStart) &&
            (!periodEnd || trade.tradeDate <= periodEnd)),
      ),
    [periodEnd, periodStart, selectedTrades, trades],
  );
  const toggleTrade = (id: string, checked: boolean) =>
    setSelectedTrades((current) =>
      checked ? [...new Set([...current, id])] : current.filter((value) => value !== id),
    );

  return (
    <form action={action} className="space-y-7">
      {review && <input type="hidden" name="reviewId" value={review.id} />}
      {state.message && (
        <p
          role="alert"
          className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200"
        >
          {state.message}
        </p>
      )}

      <fieldset className="grid gap-5 rounded-2xl border border-slate-800 bg-slate-900/45 p-5 sm:p-6 md:grid-cols-2">
        <legend className="px-2 text-lg font-semibold text-white">Review frame</legend>
        <label className="text-sm text-slate-300 md:col-span-2">
          Review type
          <input
            name="reviewType"
            required
            defaultValue={review?.reviewType}
            className={fieldClass}
            placeholder="Weekly, monthly, challenge debrief…"
          />
        </label>
        <label className="text-sm text-slate-300">
          Period start
          <input
            name="periodStart"
            type="date"
            required
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm text-slate-300">
          Period end
          <input
            name="periodEnd"
            type="date"
            required
            min={periodStart || undefined}
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            className={fieldClass}
          />
        </label>
      </fieldset>

      <fieldset className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/45 p-5 sm:p-6">
        <legend className="px-2 text-lg font-semibold text-white">
          Turn activity into learning
        </legend>
        <label className="block text-sm text-slate-300">
          Review summary
          <textarea
            name="summary"
            rows={4}
            defaultValue={review?.summary ?? ""}
            className={fieldClass}
            placeholder="What defined this period?"
          />
        </label>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm text-slate-300">
            What worked
            <textarea
              name="strengths"
              rows={5}
              defaultValue={review?.strengths ?? ""}
              className={fieldClass}
              placeholder="Processes and decisions worth repeating"
            />
          </label>
          <label className="block text-sm text-slate-300">
            What needs work
            <textarea
              name="weaknesses"
              rows={5}
              defaultValue={review?.weaknesses ?? ""}
              className={fieldClass}
              placeholder="Patterns, mistakes, or friction to address"
            />
          </label>
        </div>
        <label className="block text-sm text-slate-300">
          Next actions
          <textarea
            name="actionPlan"
            rows={4}
            defaultValue={review?.actionPlan ?? ""}
            className={fieldClass}
            placeholder="Specific adjustments for the next trading period"
          />
        </label>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-800 bg-slate-900/45 p-5 sm:p-6">
        <legend className="px-2 text-lg font-semibold text-white">Linked Trades</legend>
        <p className="mb-4 text-sm leading-6 text-slate-400">
          Showing up to 200 recent owned Trades, narrowed to the selected period. Linking is
          optional.
        </p>
        {visibleTrades.length ? (
          <div className="grid max-h-96 gap-2 overflow-y-auto pr-1">
            {visibleTrades.map((trade) => (
              <label
                key={trade.id}
                className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:border-slate-700"
              >
                <input
                  type="checkbox"
                  name="tradeIds"
                  value={trade.id}
                  checked={selectedTrades.includes(trade.id)}
                  onChange={(event) => toggleTrade(trade.id, event.target.checked)}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
                <span className="min-w-0 text-sm">
                  <span className="block font-medium text-white">
                    {trade.tradeDate} · {trade.asset} · {trade.direction}
                  </span>
                  <span className="mt-1 block text-slate-400">
                    {trade.result}
                    {trade.pnlLabel ? ` · ${trade.pnlLabel}` : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p
            role="status"
            className="rounded-xl border border-slate-800 bg-slate-950/35 p-4 text-sm text-slate-400"
          >
            No owned Trades are available for this period. You can still create the Review.
          </p>
        )}
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-800 bg-slate-900/45 p-5 sm:p-6">
        <legend className="px-2 text-lg font-semibold text-white">Linked Objectives</legend>
        <p className="mb-4 text-sm leading-6 text-slate-400">
          Connect existing owned Objectives when they support the learning. This is optional.
        </p>
        {objectives.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {objectives.map((objective) => (
              <label
                key={objective.id}
                className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:border-slate-700"
              >
                <input
                  type="checkbox"
                  name="objectiveIds"
                  value={objective.id}
                  defaultChecked={review?.objectiveIds.includes(objective.id)}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
                <span className="min-w-0 text-sm">
                  <span className="block font-medium text-white">{objective.title}</span>
                  <span className="mt-1 block text-slate-400">
                    {objective.status}
                    {objective.category ? ` · ${objective.category}` : ""}
                    {objective.targetDate ? ` · ${objective.targetDate}` : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p
            role="status"
            className="rounded-xl border border-slate-800 bg-slate-950/35 p-4 text-sm text-slate-400"
          >
            No Objectives exist yet. Objective links can be added later when Objective Management is
            available.
          </p>
        )}
      </fieldset>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <a
          href={review ? `/trading/reviews/${review.id}` : "/trading/reviews"}
          className="rounded-lg border border-slate-700 px-5 py-3 text-center font-medium text-slate-300 hover:border-slate-500 hover:text-white"
        >
          Cancel
        </a>
        <button
          disabled={pending}
          className="rounded-lg bg-phoenix-orange px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
        >
          {pending ? "Saving…" : review ? "Save Review" : "Create Review"}
        </button>
      </div>
    </form>
  );
}
