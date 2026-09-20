import { useLocale, useTranslations } from "next-intl";
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
  formatCount,
  formatCurrencyCents,
  formatRate,
} from "@/lib/trading-statistics-format";

const card =
  "min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm shadow-black/10";
const numeric = "text-right font-mono tabular-nums";

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
  const t = useTranslations("dashboard");
  const locale = useLocale();
  if (!values.length) return <span className="text-slate-500">—</span>;
  return (
    <span className="relative grid gap-1">
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
            {value.realizedPnlCents.startsWith("-") ? t("money.loss") : t("money.profit")}:{" "}
          </span>
          {value.currency} {formatCurrencyCents(value.currency, value.realizedPnlCents, locale)}
        </span>
      ))}
    </span>
  );
}

function PerformanceTable({
  id,
  title,
  empty,
  rows,
}: {
  id: string;
  title: string;
  empty: string;
  rows: Array<{ key: string; label: string; metrics: TradingPerformanceBreakdownMetrics }>;
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  return (
    <section className={card} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-lg font-semibold text-white">
        {title}
      </h3>
      {!rows.length ? (
        <p className="mt-4 text-sm text-slate-400">{empty}</p>
      ) : (
        <div
          className="mt-4 overflow-x-auto"
          role="region"
          aria-labelledby={id + "-title"}
          tabIndex={0}
        >
          <table className="w-full min-w-[640px] text-left text-xs sm:text-sm [&_th]:px-2 [&_td]:px-2 [&_td]:whitespace-nowrap">
            <thead className="text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="pb-3">{t("table.label")}</th>
                <th className={`pb-3 ${numeric}`}>{t("table.trades")}</th>
                <th className={`pb-3 ${numeric}`}>{t("table.winRate")}</th>
                <th className={`pb-3 ${numeric}`}>{t("table.averageRisk")}</th>
                <th className={`pb-3 ${numeric}`}>{t("table.realizedPnl")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="py-4 font-medium text-white">
                    {row.label}
                  </th>
                  <td className={`py-4 text-slate-300 ${numeric}`}>
                    {formatCount(row.metrics.totalTradeCount, locale)}
                  </td>
                  <td className={`py-4 text-slate-300 ${numeric}`}>
                    {formatRate(row.metrics.winRate, locale)}
                  </td>
                  <td className={`py-4 text-slate-300 ${numeric}`}>
                    {formatBasisPoints(row.metrics.averageRiskBasisPoints, locale)}
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
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const outcomes = {
    wins: formatCount(overview.winCount, locale),
    losses: formatCount(overview.lossCount, locale),
    breakeven: formatCount(overview.breakevenCount, locale),
  };
  const primaryKpis = [
    [
      t("kpis.winRate"),
      formatRate(overview.winRate, locale),
      t("kpis.outcomes", outcomes),
      t("kpis.outcomesAccessible", outcomes),
    ],
    [
      t("kpis.averageRisk"),
      formatBasisPoints(overview.averageRiskBasisPoints, locale),
      t("kpis.riskNote"),
    ],
    [
      t("kpis.errorRate"),
      formatRate(overview.tradeErrorRate, locale),
      t("kpis.affectedTrades", { count: overview.tradesWithErrorsCount }),
    ],
  ];
  const activity = [
    [
      t("activity.totalTrades"),
      formatCount(overview.totalTradeCount, locale),
      t("activity.tradeCounts", {
        closed: overview.closedTradeCount,
        unresolved: overview.unresolvedTradeCount,
      }),
    ],
    [t("activity.reviews"), formatCount(overview.reviewCount, locale), t("activity.reviewScope")],
    [
      t("activity.objectives"),
      formatCount(overview.objectiveCount, locale),
      t("activity.objectiveScope"),
    ],
  ];
  return (
    <div className="grid min-w-0 max-w-full gap-6">
      {!overview.totalTradeCount && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4 text-sm text-slate-300">
          <strong className="font-medium text-white">{t("empty.title")}</strong>{" "}
          {t("empty.description")}
        </div>
      )}
      <section aria-labelledby="primary-insights-title" className="grid gap-4">
        <SectionHeader
          id="primary-insights-title"
          eyebrow={t("performance.eyebrow")}
          title={t("performance.title")}
          description={t("performance.description")}
        />
        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <section className={`${card} xl:row-span-2`} aria-labelledby="pnl-title">
            <h3 id="pnl-title" className="text-lg font-semibold">
              {t("pnl.title")}
            </h3>
            <p className="mt-1 text-sm text-slate-400">{t("pnl.currencyNotice")}</p>
            {!overview.realizedPnlByCurrency.length ? (
              <p className="mt-5 text-sm text-slate-400">{t("pnl.empty")}</p>
            ) : (
              <div className="mt-5 grid gap-3">
                {overview.realizedPnlByCurrency.map((row) => (
                  <div
                    key={row.currency}
                    className="flex flex-wrap items-baseline justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-300">{row.currency}</span>
                    <span
                      className={`max-w-full overflow-x-auto whitespace-nowrap text-xl font-semibold ${numeric} ${row.realizedPnlCents.startsWith("-") ? "text-rose-300" : "text-emerald-300"}`}
                    >
                      {formatCurrencyCents(row.currency, row.realizedPnlCents, locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-5 text-xs leading-5 text-slate-500">{t("pnl.detailHint")}</p>
          </section>
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            {primaryKpis.map(([label, value, note, accessibleNote]) => (
              <article key={label} className={card}>
                <p className="text-sm font-medium text-slate-300">{label}</p>
                <p className={`mt-2 text-2xl font-semibold tracking-tight text-white ${numeric}`}>
                  {value}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  <span aria-hidden={accessibleNote ? true : undefined}>{note}</span>
                  {accessibleNote && <span className="sr-only">{accessibleNote}</span>}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section aria-labelledby="activity-title" className="grid gap-4">
        <SectionHeader
          id="activity-title"
          eyebrow={t("activity.eyebrow")}
          title={t("activity.title")}
          description={t("activity.description")}
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
            {t("pnl.detailTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{t("pnl.detailDescription")}</p>
        </div>
        {!overview.realizedPnlByCurrency.length ? (
          <p className="mt-5 text-sm text-slate-400">{t("pnl.empty")}</p>
        ) : (
          <div
            className="mt-5 overflow-x-auto"
            role="region"
            aria-labelledby="pnl-detail-title"
            tabIndex={0}
          >
            <table className="w-full min-w-[680px] text-left text-xs sm:text-sm [&_th]:px-3 [&_td]:px-3 [&_td]:whitespace-nowrap">
              <thead className="text-xs text-slate-500 uppercase">
                <tr>
                  <th className="pb-3">{t("pnl.currency")}</th>
                  <th className={`pb-3 ${numeric}`}>{t("pnl.realized")}</th>
                  <th className={`pb-3 ${numeric}`}>{t("pnl.averageTrade")}</th>
                  <th className={`pb-3 ${numeric}`}>{t("pnl.grossProfit")}</th>
                  <th className={`pb-3 ${numeric}`}>{t("pnl.grossLoss")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {overview.realizedPnlByCurrency.map((row) => (
                  <tr key={row.currency}>
                    <th scope="row" className="py-4 text-white">
                      {row.currency}
                    </th>
                    <td className={numeric}>
                      {formatCurrencyCents(row.currency, row.realizedPnlCents, locale)}
                    </td>
                    <td className={numeric}>
                      {formatCurrencyCents(row.currency, row.averagePnlCents, locale)}
                    </td>
                    <td className={`text-emerald-300 ${numeric}`}>
                      {formatCurrencyCents(row.currency, row.grossProfitCents, locale)}
                    </td>
                    <td className={`text-rose-300 ${numeric}`}>
                      {formatCurrencyCents(row.currency, row.grossLossCents, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <SectionHeader
        eyebrow={t("breakdowns.eyebrow")}
        title={t("breakdowns.title")}
        description={t("breakdowns.description")}
      />
      <PerformanceTable
        id="setups-performance"
        empty={t("breakdowns.setups.empty")}
        title={t("breakdowns.setups.title")}
        rows={setups.map((row) => ({
          key: row.setupId,
          label: row.setupName,
          metrics: row.metrics,
        }))}
      />
      <PerformanceTable
        id="sessions-performance"
        empty={t("breakdowns.sessions.empty")}
        title={t("breakdowns.sessions.title")}
        rows={sessions.map((row) => ({
          key: row.sessionType,
          label: row.sessionType,
          metrics: row.metrics,
        }))}
      />
      <PerformanceTable
        id="assets-performance"
        empty={t("breakdowns.assets.empty")}
        title={t("breakdowns.assets.title")}
        rows={assets.map((row) => ({ key: row.asset, label: row.asset, metrics: row.metrics }))}
      />
      <SectionHeader
        eyebrow={t("errors.eyebrow")}
        title={t("errors.title")}
        description={t("errors.description")}
      />
      <section className={card} aria-labelledby="errors-title">
        <h3 id="errors-title" className="text-lg font-semibold">
          {t("errors.insightsTitle")}
        </h3>
        {!errors.byCategory.length && !errors.bySeverity.length ? (
          <p className="mt-4 text-sm text-slate-400">{t("errors.empty")}</p>
        ) : (
          <div className="mt-5 grid min-w-0 gap-6 lg:grid-cols-2">
            {[
              [t("errors.byCategory"), errors.byCategory.map((x) => ({ label: x.category, ...x }))],
              [t("errors.bySeverity"), errors.bySeverity.map((x) => ({ label: x.severity, ...x }))],
            ].map(([heading, values]) => (
              <div key={String(heading)} className="min-w-0 overflow-x-auto">
                <h3 className="text-sm font-semibold text-slate-300">{String(heading)}</h3>
                <table className="mt-3 w-full text-left text-sm">
                  <thead className="text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="pb-2">{t("table.label")}</th>
                      <th className={`pb-2 ${numeric}`}>{t("errors.count")}</th>
                      <th className={`pb-2 ${numeric}`}>{t("errors.affectedTrades")}</th>
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
                        <td className={numeric}>{formatCount(x.errorCount, locale)}</td>
                        <td className={numeric}>{formatCount(x.affectedTradeCount, locale)}</td>
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
