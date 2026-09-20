import { jsx } from "react/jsx-runtime";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import fr from "@/i18n/messages/fr.json";
import es from "@/i18n/messages/es.json";
import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import TradingPage from "@/app/trading/page";
import { getTradingOverview } from "@/services/trading/trading-statistics";

import { TradingDashboard } from "@/components/trading/dashboard/trading-dashboard";
import { TradingFilters } from "@/components/trading/dashboard/trading-filters";

const request = vi.hoisted(() => ({ locale: "en" as "en" | "fr" | "es" }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () =>
    createTranslator({
      locale: request.locale,
      messages: { en, fr, es }[request.locale],
      namespace: "dashboard",
    }),
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "fixture" } } }) },
  }),
}));
vi.mock("@/services/trading/current-trader", () => ({
  resolveCurrentTraderId: async () => "fixture",
}));
vi.mock("@/services/trading/trading-accounts", () => ({ listTradingAccounts: async () => [] }));
vi.mock("@/services/trading/trading-statistics", () => ({
  getTradingOverview: vi.fn(async () => overview),
  getTradingSetupBreakdown: async () => [],
  getTradingSessionTypeBreakdown: async () => [],
  getTradingAssetBreakdown: async () => [],
  getTradingErrorBreakdown: async () => ({ byCategory: [], bySeverity: [] }),
}));

type DashboardProps = ComponentProps<typeof TradingDashboard>;
const overview: DashboardProps["overview"] = {
  totalTradeCount: 3,
  closedTradeCount: 3,
  unresolvedTradeCount: 0,
  winCount: 1,
  lossCount: 1,
  breakevenCount: 1,
  winRate: 1 / 3,
  averageRiskBasisPoints: "125.9999",
  tradeErrorCount: 0,
  tradesWithErrorsCount: 0,
  tradeErrorRate: 0,
  reviewCount: 0,
  objectiveCount: 0,
  realizedPnlByCurrency: [
    {
      currency: "USD",
      realizedPnlCents: "-27564",
      averagePnlCents: "-27564",
      grossProfitCents: "0",
      grossLossCents: "-27564",
    },
    {
      currency: "EUR",
      realizedPnlCents: "0",
      averagePnlCents: "0",
      grossProfitCents: "100",
      grossLossCents: "-100",
    },
  ],
};

describe.each([
  ["en", en],
  ["fr", fr],
  ["es", es],
] as const)("%s Dashboard presentation", (locale, messages) => {
  const render = (children: ReactNode) =>
    renderToStaticMarkup(jsx(NextIntlClientProvider, { locale, messages, children }));
  const escape = (value: string) =>
    renderToStaticMarkup(createElement("span", null, value)).slice(6, -7);

  it("renders translated page headings and status notices without exposing service errors", async () => {
    request.locale = locale;
    const html = render(
      await TradingPage({ searchParams: Promise.resolve({ from: "invalid", created: "trade" }) }),
    );
    expect(html).toContain(escape(messages.dashboard.page.title));
    expect(html).toContain(escape(messages.dashboard.page.description));
    expect(html).toContain(escape(messages.dashboard.notices.invalidFilters));
    expect(html).toContain(escape(messages.dashboard.notices.tradeRecorded));
    expect(html.match(/role="status"/g)).toHaveLength(2);
    vi.mocked(getTradingOverview).mockRejectedValueOnce(new Error("Internal service detail"));
    const unavailable = render(await TradingPage({ searchParams: Promise.resolve({}) }));
    expect(unavailable).toContain(escape(messages.dashboard.notices.unavailable));
    expect(unavailable).not.toContain("Internal service detail");
  });

  it("translates sections/accessibility while preserving exact runtime data and order", () => {
    const props: DashboardProps = {
      overview,
      setups: ["Z Custom Setup", "a Custom Setup"].map((setupName) => ({
        setupId: setupName,
        setupName,
        metrics: overview,
      })),
      sessions: [{ sessionType: "London Session Custom", metrics: overview }],
      assets: [{ asset: "XAUusd Custom", metrics: overview }],
      errors: {
        byCategory: [{ category: "Custom CATEGORY", errorCount: 1, affectedTradeCount: 1 }],
        bySeverity: [{ severity: "Custom SEVERITY", errorCount: 1, affectedTradeCount: 1 }],
      },
    };
    const before = structuredClone(props);
    const html = render(createElement(TradingDashboard, props));
    for (const label of [
      messages.dashboard.performance.title,
      messages.dashboard.pnl.detailTitle,
      messages.dashboard.errors.insightsTitle,
      messages.dashboard.table.realizedPnl,
    ])
      expect(html).toContain(escape(label));
    for (const label of [
      "Z Custom Setup",
      "a Custom Setup",
      "London Session Custom",
      "XAUusd Custom",
      "Custom CATEGORY",
      "Custom SEVERITY",
      "USD",
      "EUR",
    ])
      expect(html).toContain(label);
    expect(html.indexOf("Z Custom Setup")).toBeLessThan(html.indexOf("a Custom Setup"));
    expect(html.indexOf(">USD<")).toBeLessThan(html.indexOf(">EUR<"));
    expect(html).toContain(escape(messages.dashboard.money.loss) + ":");
    // The existing zero-P&L Profit prefix is intentionally preserved.
    expect(html).toContain(escape(messages.dashboard.money.profit) + ":");
    expect(html).toContain('aria-labelledby="setups-performance-title"');
    expect(html).toContain('tabindex="0"');
    expect(props).toEqual(before);
  });

  it("renders localized empty and missing-value states", () => {
    const html = render(
      createElement(TradingDashboard, {
        overview: {
          ...overview,
          totalTradeCount: 0,
          realizedPnlByCurrency: [],
          winRate: null,
          averageRiskBasisPoints: null,
        },
        setups: [],
        sessions: [],
        assets: [],
        errors: { byCategory: [], bySeverity: [] },
      }),
    );
    for (const label of [
      messages.dashboard.empty.title,
      messages.dashboard.empty.description,
      messages.dashboard.pnl.empty,
      messages.dashboard.breakdowns.setups.empty,
      messages.dashboard.breakdowns.sessions.empty,
      messages.dashboard.breakdowns.assets.empty,
      messages.dashboard.errors.empty,
      "—",
    ])
      expect(html).toContain(escape(label));
  });

  it("translates filters without changing native ISO values or account data", () => {
    const account: ComponentProps<typeof TradingFilters>["accounts"][number] = {
      id: "account-id",
      traderId: "trader-id",
      propFirmId: null,
      accountName: "Raw Account",
      broker: "Raw Broker",
      accountType: "cash",
      currency: "USD",
      initialBalanceCents: 100000,
      currentBalanceCents: null,
      balanceUpdatedAt: null,
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
      status: "active",
    };
    const html = render(
      createElement(TradingFilters, {
        filter: { from: "2026-08-01", to: "2026-08-31", tradingAccountId: account.id },
        accounts: [account],
      }),
    );
    for (const label of Object.values(messages.dashboard.filters))
      expect(html).toContain(escape(label));
    expect(html).toContain('type="date" name="from" value="2026-08-01"');
    expect(html).toContain('type="date" name="to" value="2026-08-31"');
    expect(html).toContain("Raw Account / Raw Broker / USD");
    expect(html).toContain('href="/trading"');
  });
});

describe("P&L detail formatting", () => {
  it("renders monetary values with exactly two decimals and no raw aggregate precision", () => {
    const html = renderToStaticMarkup(
      jsx(NextIntlClientProvider, {
        locale: "en",
        messages: en,
        children: createElement(TradingDashboard, {
          overview: {
            totalTradeCount: 3,
            closedTradeCount: 3,
            unresolvedTradeCount: 0,
            winCount: 1,
            lossCount: 1,
            breakevenCount: 1,
            winRate: 1 / 3,
            averageRiskBasisPoints: "100",
            realizedPnlByCurrency: [
              {
                currency: "EUR",
                realizedPnlCents: "10000.000000000000",
                averagePnlCents: "1516.6666666666666667",
                grossProfitCents: "10000.000000000000",
                grossLossCents: "-4550.000000000000",
              },
            ],
            tradeErrorCount: 0,
            tradesWithErrorsCount: 0,
            tradeErrorRate: 0,
            reviewCount: 0,
            objectiveCount: 0,
          },
          setups: [],
          sessions: [],
          assets: [],
          errors: { byCategory: [], bySeverity: [] },
        }),
      }),
    );

    expect(html).toContain("+€100.00");
    expect(html).toContain("+€15.17");
    expect(html).toContain("−€45.50");
    expect(html).toContain("33.33%");
    expect(html).toContain("0.00%");
    expect(html).not.toContain(".000000000000");
    expect(html).not.toContain(".6666666666666667");
  });
});
