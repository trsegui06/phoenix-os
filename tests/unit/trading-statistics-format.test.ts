import { describe, expect, it } from "vitest";

import {
  formatBasisPoints,
  formatCurrencyCents,
  formatRate,
} from "@/lib/trading-statistics-format";

describe("Trading Statistics presentation formatters", () => {
  it.each([
    ["145000", "+€1,450.00"],
    ["-2300", "−€23.00"],
    ["0", "€0.00"],
    ["1250.5", "+€12.505"],
    ["90071992547409930000", "+€900,719,925,474,099,300.00"],
  ])("formats exact EUR cents %s", (value, expected) => {
    expect(formatCurrencyCents("EUR", value)).toBe(expected);
  });

  it("keeps currencies visibly separate", () => {
    expect([formatCurrencyCents("EUR", "100"), formatCurrencyCents("USD", "200")]).toEqual([
      "+€1.00",
      "+$2.00",
    ]);
  });

  it("formats null and finite rates without inventing zero", () => {
    expect(formatRate(null)).toBe("—");
    expect(formatRate(2 / 3)).toBe("66.67%");
  });

  it("formats exact basis points as a percentage", () => {
    expect(formatBasisPoints(null)).toBe("—");
    expect(formatBasisPoints("100")).toBe("1.00%");
    expect(formatBasisPoints("125.5000000000000000")).toBe("1.25%");
  });
});
