import type {
  TradingAssetBreakdown,
  TradingErrorBreakdown,
  TradingOverview,
  TradingPerformanceBreakdownMetrics,
  TradingSessionTypeBreakdown,
  TradingSetupBreakdown,
} from "@/domain/trading/trading-statistics";
import {
  formatBasisPoints,
  formatCurrencyCents,
  formatRate,
} from "@/lib/trading-statistics-format";

const card =
  "min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm shadow-black/10";
const numeric = "text-right tabular-nums";

function SectionHeader({
  id,
  eyebrow,
  title,
  description,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-xs font-semibold tracking-[0.16em] text-phoenix-orange uppercase">
        {eyebrow}
      </p>
      <h2 id={id} className="mt-2 text-xl font-semibold tracking-tight text-white">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
    </header>
  );
}

function MoneyList({
  values,
}: {
  values: TradingPerformanceBreakdownMetrics["realizedPnlByCurrency"];
}) {
  if (!values.length) return <span className="text-slate-500">—</span>;
  return (
    <span className="grid gap-1">
      {values.map((value) => (
        <span
          key={value.currency}
          className={
            value.realizedPnlCents.startsWith("-")
              ? "text-rose-300"
              : value.realizedPnlCents === "0"
                ? "text-slate-300"
                : "text-emerald-300"
          }
        >
          <span className="sr-only">
            {value.realizedPnlCents.startsWith("-") ? "Loss" : "Profit"}:{" "}
          </span>
          {value.currency} {formatCurrencyCents(value.currency, value.realizedPnlCents)}
        </span>
      ))}
    </span>
  );
}

function PerformanceTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; label: string; metrics: TradingPerformanceBreakdownMetrics }>;
}) {
  return (
    <section className={card} aria-labelledby={`${title.replaceAll(" ", "-")}-title`}>
      <h3 id={`${title.replaceAll(" ", "-")}-title`} className="text-lg font-semibold text-white">
        {title}
      </h3>
      {!rows.length ? (
        <p className="mt-4 text-sm text-slate-400">No {title.toLowerCase()} available yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-0 text-left text-xs sm:min-w-[640px] sm:text-sm">
            <thead className="text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="pb-3">Label</th>
                <th className={`pb-3 ${numeric}`}>Trades</th>
                <th className={`pb-3 ${numeric}`}>Win rate</th>
                <th className={`pb-3 ${numeric}`}>Avg risk</th>
                <th className={`pb-3 ${numeric}`}>Realized P&amp;L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="py-4 font-medium text-white">
                    {row.label}
                  </th>
                  <td className={`py-4 text-slate-300 ${numeric}`}>
                    {row.metrics.totalTradeCount}
                  </td>
                  <td className={`py-4 text-slate-300 ${numeric}`}>
                    {formatRate(row.metrics.winRate)}
                  </td>
                  <td className={`py-4 text-slate-300 ${numeric}`}>
                    {formatBasisPoints(row.metrics.averageRiskBasisPoints)}
                  </td>
                  <td className={`py-4 ${numeric}`}>
                    <MoneyList values={row.metrics.realizedPnlByCurrency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function TradingDashboard({
  overview,
  setups,
  sessions,
  assets,
  errors,
}: {
  overview: TradingOverview;
  setups: TradingSetupBreakdown[];
  sessions: TradingSessionTypeBreakdown[];
  assets: TradingAssetBreakdown[];
  errors: TradingErrorBreakdown;
}) {
  const primaryKpis = [
    [
      "Win Rate",
      formatRate(overview.winRate),
      `${overview.winCount}W · ${overview.lossCount}L · ${overview.breakevenCount}BE`,
    ],
    ["Average Risk", formatBasisPoints(overview.averageRiskBasisPoints), "All filtered trades"],
    [
      "Trade Error Rate",
      formatRate(overview.tradeErrorRate),
      `${overview.tradesWithErrorsCount} affected trades`,
    ],
  ];
  const activity = [
    [
      "Total Trades",
      String(overview.totalTradeCount),
      `${overview.closedTradeCount} closed · ${overview.unresolvedTradeCount} unresolved`,
    ],
    ["Reviews", String(overview.reviewCount), "Date-overlap scope"],
    ["Objectives", String(overview.objectiveCount), "Trader-wide scope"],
  ];
  return (
    <div className="grid min-w-0 max-w-full gap-6">
      {!overview.totalTradeCount && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4 text-sm text-slate-300">
          <strong className="font-medium text-white">No trades recorded yet.</strong> Your
          statistics will appear after trading data is added.
        </div>
      )}
      <section aria-labelledby="primary-insights-title" className="grid gap-4">
        <SectionHeader
          id="primary-insights-title"
          eyebrow="Current signal"
          title="Performance, risk and discipline"
          description="A focused view of realized outcomes and process quality."
        />
        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <section className={`${card} xl:row-span-2`} aria-labelledby="pnl-title">
            <h3 id="pnl-title" className="text-lg font-semibold">
              Realized P&amp;L by Currency
            </h3>
            <p className="mt-1 text-sm text-slate-400">Currencies are never combined.</p>
            {!overview.realizedPnlByCurrency.length ? (
              <p className="mt-5 text-sm text-slate-400">No realized P&amp;L yet.</p>
            ) : (
              <div className="mt-5 grid gap-3">
                {overview.realizedPnlByCurrency.map((row) => (
                  <div
                    key={row.currency}
                    className="flex items-baseline justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-300">{row.currency}</span>
                    <span
                      className={`text-xl font-semibold ${numeric} ${row.realizedPnlCents.startsWith("-") ? "text-rose-300" : "text-emerald-300"}`}
                    >
                      {formatCurrencyCents(row.currency, row.realizedPnlCents)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-5 text-xs leading-5 text-slate-500">
              Detailed realized, average, gross profit and gross loss values remain available below.
            </p>
          </section>
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            {primaryKpis.map(([label, value, note]) => (
              <article key={label} className={card}>
                <p className="text-sm font-medium text-slate-300">{label}</p>
                <p className={`mt-2 text-2xl font-semibold tracking-tight text-white ${numeric}`}>
                  {value}
                </p>
                <p className="mt-1 text-xs text-slate-500">{note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section aria-labelledby="activity-title" className="grid gap-4">
        <SectionHeader
          id="activity-title"
          eyebrow="Activity & learning"
          title="Practice context"
          description="Volume and learning signals, intentionally separate from performance."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {activity.map(([label, value, note]) => (
            <article
              key={label}
              className="rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-4"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className={`mt-1 text-2xl font-semibold text-white ${numeric}`}>{value}</p>
              <p className="mt-1 text-xs text-slate-500">{note}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={card} aria-labelledby="pnl-detail-title">
        <div>
          <h2 id="pnl-detail-title" className="text-lg font-semibold">
            P&amp;L detail
          </h2>
          <p className="mt-1 text-sm text-slate-400">Exact currency-scoped realized results.</p>
        </div>
        {!overview.realizedPnlByCurrency.length ? (
          <p className="mt-5 text-sm text-slate-400">No realized P&amp;L yet.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-0 text-left text-xs sm:min-w-[680px] sm:text-sm">
              <thead className="text-xs text-slate-500 uppercase">
                <tr>
                  <th className="pb-3">Currency</th>
                  <th className={`pb-3 ${numeric}`}>Realized</th>
                  <th className={`pb-3 ${numeric}`}>Average Trade</th>
                  <th className={`pb-3 ${numeric}`}>Gross Profit</th>
                  <th className={`pb-3 ${numeric}`}>Gross Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {overview.realizedPnlByCurrency.map((row) => (
                  <tr key={row.currency}>
                    <th className="py-4 text-white">{row.currency}</th>
                    <td className={numeric}>
                      {formatCurrencyCents(row.currency, row.realizedPnlCents)}
                    </td>
                    <td className={numeric}>
                      {formatCurrencyCents(row.currency, row.averagePnlCents)}
                    </td>
                    <td className={`text-emerald-300 ${numeric}`}>
                      {formatCurrencyCents(row.currency, row.grossProfitCents)}
                    </td>
                    <td className={`text-rose-300 ${numeric}`}>
                      {formatCurrencyCents(row.currency, row.grossLossCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <SectionHeader
        eyebrow="Performance breakdowns"
        title="Execution patterns"
        description="Exact backend ordering with no ranking or label normalization."
      />
      <PerformanceTable
        title="Setup Performance"
        rows={setups.map((row) => ({
          key: row.setupId,
          label: row.setupName,
          metrics: row.metrics,
        }))}
      />
      <PerformanceTable
        title="Session Performance"
        rows={sessions.map((row) => ({
          key: row.sessionType,
          label: row.sessionType,
          metrics: row.metrics,
        }))}
      />
      <PerformanceTable
        title="Asset Performance"
        rows={assets.map((row) => ({ key: row.asset, label: row.asset, metrics: row.metrics }))}
      />
      <SectionHeader
        eyebrow="Discipline"
        title="Error patterns"
        description="Frequency and affected trades without severity weighting."
      />
      <section className={card} aria-labelledby="errors-title">
        <h3 id="errors-title" className="text-lg font-semibold">
          Trade Error Insights
        </h3>
        {!errors.byCategory.length && !errors.bySeverity.length ? (
          <p className="mt-4 text-sm text-slate-400">No recorded Trade Errors.</p>
        ) : (
          <div className="mt-5 grid min-w-0 gap-6 lg:grid-cols-2">
            {[
              ["By Category", errors.byCategory.map((x) => ({ label: x.category, ...x }))],
              ["By Severity", errors.bySeverity.map((x) => ({ label: x.severity, ...x }))],
            ].map(([heading, values]) => (
              <div key={String(heading)} className="min-w-0 overflow-x-auto">
                <h3 className="text-sm font-semibold text-slate-300">{String(heading)}</h3>
                <table className="mt-3 w-full text-left text-sm">
                  <thead className="text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="pb-2">Label</th>
                      <th className={`pb-2 ${numeric}`}>Errors</th>
                      <th className={`pb-2 ${numeric}`}>Affected Trades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(
                      values as Array<{
                        label: string;
                        errorCount: number;
                        affectedTradeCount: number;
                      }>
                    ).map((x) => (
                      <tr key={x.label}>
                        <th className="py-3 text-white">{x.label}</th>
                        <td className={numeric}>{x.errorCount}</td>
                        <td className={numeric}>{x.affectedTradeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
