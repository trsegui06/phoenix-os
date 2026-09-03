import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TradingDashboard } from "@/components/trading/dashboard/trading-dashboard";

describe("P&L detail formatting", () => {
  it("renders monetary values with exactly two decimals and no raw aggregate precision", () => {
    const html = renderToStaticMarkup(
      createElement(TradingDashboard, {
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
