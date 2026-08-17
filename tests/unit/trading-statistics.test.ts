import { describe, expect, it } from "vitest";

import { mapTradingOverviewRow } from "@/data/trading/trading-statistics-repository";
import {
  TradingStatisticsValidationError,
  validateTradingStatisticsFilter,
} from "@/domain/trading/trading-statistics";

const accountId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const zeroRow = {
  total_trade_count: "0",
  closed_trade_count: "0",
  unresolved_trade_count: "0",
  win_count: "0",
  loss_count: "0",
  breakeven_count: "0",
  win_rate: null,
  average_risk_basis_points: null,
  realized_pnl_by_currency: [],
  trade_error_count: "0",
  trades_with_errors_count: "0",
  trade_error_rate: null,
  review_count: "0",
  objective_count: "0",
};

describe("Trading Statistics filters", () => {
  it.each([
    [{}, {}],
    [{ from: "2026-01-01" }, { from: "2026-01-01" }],
    [{ to: "2026-12-31" }, { to: "2026-12-31" }],
    [
      { from: "2026-01-01", to: "2026-12-31", tradingAccountId: accountId },
      { from: "2026-01-01", to: "2026-12-31", tradingAccountId: accountId },
    ],
  ])("accepts filter %#", (input, expected) => {
    expect(validateTradingStatisticsFilter(input)).toEqual(expected);
  });

  it.each(["2026-1-01", "2026-02-30", "2026-01-01T00:00:00Z"])(
    "rejects invalid date %s",
    (from) => {
      expect(() => validateTradingStatisticsFilter({ from })).toThrow(
        TradingStatisticsValidationError,
      );
    },
  );

  it("rejects a reversed range", () => {
    expect(() => validateTradingStatisticsFilter({ from: "2026-02-01", to: "2026-01-31" })).toThrow(
      TradingStatisticsValidationError,
    );
  });

  it("rejects an invalid Account UUID", () => {
    expect(() => validateTradingStatisticsFilter({ tradingAccountId: "not-a-uuid" })).toThrow(
      TradingStatisticsValidationError,
    );
  });
});

describe("Trading Overview transport mapping", () => {
  it("maps the canonical zero state without non-finite values", () => {
    expect(mapTradingOverviewRow(zeroRow)).toEqual({
      totalTradeCount: 0,
      closedTradeCount: 0,
      unresolvedTradeCount: 0,
      winCount: 0,
      lossCount: 0,
      breakevenCount: 0,
      winRate: null,
      averageRiskBasisPoints: null,
      realizedPnlByCurrency: [],
      tradeErrorCount: 0,
      tradesWithErrorsCount: 0,
      tradeErrorRate: null,
      reviewCount: 0,
      objectiveCount: 0,
    });
  });

  it("parses safe counts and finite rates while preserving exact money strings", () => {
    const overview = mapTradingOverviewRow({
      ...zeroRow,
      total_trade_count: "3",
      closed_trade_count: "3",
      win_count: "2",
      loss_count: "1",
      win_rate: "0.66666666666666666667",
      average_risk_basis_points: "125.5000000000000000",
      trade_error_count: "3",
      trades_with_errors_count: "2",
      trade_error_rate: "0.66666666666666666667",
      review_count: "4",
      objective_count: "5",
      realized_pnl_by_currency: [
        {
          currency: "EUR",
          realizedPnlCents: "90071992547409930000",
          averagePnlCents: "1250.5000000000000000",
          grossProfitCents: "90071992547409934000",
          grossLossCents: "-4000",
        },
      ],
    });
    expect(overview.winRate).toBeCloseTo(2 / 3);
    expect(overview.tradeErrorRate).toBeCloseTo(2 / 3);
    expect(overview.realizedPnlByCurrency[0]?.realizedPnlCents).toBe("90071992547409930000");
    expect(overview.averageRiskBasisPoints).toBe("125.5000000000000000");
  });

  it("rejects unsafe counts", () => {
    expect(() =>
      mapTradingOverviewRow({ ...zeroRow, total_trade_count: "9007199254740992" }),
    ).toThrow(/unsafe/);
  });

  it.each(["NaN", "Infinity", "-0.1", "1.1", "not-a-rate"])(
    "rejects malformed or non-finite rate %s",
    (win_rate) => {
      expect(() => mapTradingOverviewRow({ ...zeroRow, win_rate })).toThrow();
    },
  );

  it("rejects inconsistent count invariants", () => {
    expect(() => mapTradingOverviewRow({ ...zeroRow, total_trade_count: "1" })).toThrow(
      /invariants/,
    );
  });

  it("keeps Review date scope, Objective Trader scope, and Account scope explicit", () => {
    const source = validateTradingStatisticsFilter({
      from: "2026-01-01",
      to: "2026-12-31",
      tradingAccountId: accountId,
    });
    expect(source).toEqual({
      from: "2026-01-01",
      to: "2026-12-31",
      tradingAccountId: accountId,
    });
  });
});
