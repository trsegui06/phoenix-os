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

const card = "rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10";

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
      <h2 id={`${title.replaceAll(" ", "-")}-title`} className="text-lg font-semibold text-white">
        {title}
      </h2>
      {!rows.length ? (
        <p className="mt-4 text-sm text-slate-400">No {title.toLowerCase()} available yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="pb-3">Label</th>
                <th className="pb-3">Trades</th>
                <th className="pb-3">Win rate</th>
                <th className="pb-3">Avg risk</th>
                <th className="pb-3">Realized P&amp;L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="py-4 font-medium text-white">
                    {row.label}
                  </th>
                  <td className="py-4 text-slate-300">{row.metrics.totalTradeCount}</td>
                  <td className="py-4 text-slate-300">{formatRate(row.metrics.winRate)}</td>
                  <td className="py-4 text-slate-300">
                    {formatBasisPoints(row.metrics.averageRiskBasisPoints)}
                  </td>
                  <td className="py-4">
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
  const kpis = [
    [
      "Total Trades",
      String(overview.totalTradeCount),
      `${overview.closedTradeCount} closed · ${overview.unresolvedTradeCount} unresolved`,
    ],
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
    ["Reviews", String(overview.reviewCount), "Date-overlap scope"],
    ["Objectives", String(overview.objectiveCount), "Trader-wide scope"],
  ];
  return (
    <div className="grid gap-6">
      {!overview.totalTradeCount && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4 text-sm text-slate-300">
          No trading data yet.
        </div>
      )}
      <section aria-labelledby="overview-title">
        <h2 id="overview-title" className="sr-only">
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map(([label, value, note]) => (
            <article key={label} className={card}>
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                {label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
              <p className="mt-2 text-sm text-slate-400">{note}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={card} aria-labelledby="pnl-title">
        <div>
          <h2 id="pnl-title" className="text-lg font-semibold">
            Realized P&amp;L by Currency
          </h2>
          <p className="mt-1 text-sm text-slate-400">Currencies are never combined.</p>
        </div>
        {!overview.realizedPnlByCurrency.length ? (
          <p className="mt-5 text-sm text-slate-400">No realized P&amp;L yet.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase">
                <tr>
                  <th className="pb-3">Currency</th>
                  <th className="pb-3">Realized</th>
                  <th className="pb-3">Average Trade</th>
                  <th className="pb-3">Gross Profit</th>
                  <th className="pb-3">Gross Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {overview.realizedPnlByCurrency.map((row) => (
                  <tr key={row.currency}>
                    <th className="py-4 text-white">{row.currency}</th>
                    <td>{formatCurrencyCents(row.currency, row.realizedPnlCents)}</td>
                    <td>{formatCurrencyCents(row.currency, row.averagePnlCents)}</td>
                    <td className="text-emerald-300">
                      {formatCurrencyCents(row.currency, row.grossProfitCents)}
                    </td>
                    <td className="text-rose-300">
                      {formatCurrencyCents(row.currency, row.grossLossCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
      <section className={card} aria-labelledby="errors-title">
        <h2 id="errors-title" className="text-lg font-semibold">
          Trade Error Insights
        </h2>
        {!errors.byCategory.length && !errors.bySeverity.length ? (
          <p className="mt-4 text-sm text-slate-400">No recorded Trade Errors.</p>
        ) : (
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            {[
              ["By Category", errors.byCategory.map((x) => ({ label: x.category, ...x }))],
              ["By Severity", errors.bySeverity.map((x) => ({ label: x.severity, ...x }))],
            ].map(([heading, values]) => (
              <div key={String(heading)}>
                <h3 className="text-sm font-semibold text-slate-300">{String(heading)}</h3>
                <table className="mt-3 w-full text-left text-sm">
                  <thead className="text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="pb-2">Label</th>
                      <th className="pb-2">Errors</th>
                      <th className="pb-2">Affected Trades</th>
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
                        <td>{x.errorCount}</td>
                        <td>{x.affectedTradeCount}</td>
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
