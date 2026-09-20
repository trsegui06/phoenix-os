import { describe, expect, it } from "vitest";

import {
  formatBasisPoints,
  formatCount,
  formatCurrencyCents,
  formatRate,
} from "@/lib/trading-statistics-format";

describe("Trading Statistics presentation formatters", () => {
  it.each([
    ["145000", "+€1,450.00"],
    ["-2300", "−€23.00"],
    ["0", "€0.00"],
    ["1250.5", "+€12.51"],
    ["10000.000000000000", "+€100.00"],
    ["-4550.000000000000", "−€45.50"],
    ["0.499999999999", "€0.00"],
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
    expect(formatRate(0)).toBe("0.00%");
    expect(formatRate(1)).toBe("100.00%");
    expect(formatRate(2 / 3)).toBe("66.67%");
  });

  it("formats exact basis points as a percentage", () => {
    expect(formatBasisPoints(null)).toBe("—");
    expect(formatBasisPoints("100")).toBe("1.00%");
    expect(formatBasisPoints("125.5000000000000000")).toBe("1.25%");
  });
});

describe.each(["en", "fr", "es"])("%s display-only formatting", (locale) => {
  const localized = (en: string, fr: string, es: string) => ({ en, fr, es })[locale];

  it("preserves currency identity, signs, zero and the two-decimal contract", () => {
    expect(formatCurrencyCents("USD", "-27564", locale)).toBe(
      localized("−$275.64", "−275,64 $US", "−275,64 US$"),
    );
    expect(formatCurrencyCents("EUR", "1250.5", locale)).toBe(
      localized("+€12.51", "+12,51 €", "+12,51 €"),
    );
    expect(formatCurrencyCents("USD", "0", locale)).toBe(
      localized("$0.00", "0,00 $US", "0,00 US$"),
    );
    expect(formatCurrencyCents("USD", "-0.4999", locale)).toBe(
      formatCurrencyCents("USD", "0", locale),
    );
    expect(formatCurrencyCents("JPY", "100", locale)).toMatch(/[.,]00/);
    expect(formatCurrencyCents("USD", "invalid", locale)).toBe("—");
  });

  it("keeps huge amounts exact and preserves fractional-cent rounding carry", () => {
    expect(formatCurrencyCents("EUR", "90071992547409930099.5", locale)).toBe(
      localized(
        "+€900,719,925,474,099,301.00",
        "+900 719 925 474 099 301,00 €",
        "+900.719.925.474.099.301,00 €",
      ),
    );
    expect(formatCurrencyCents("EUR", "-999.5", locale)).toBe(
      localized("−€10.00", "−10,00 €", "−10,00 €"),
    );
    expect(formatCurrencyCents("EUR", "999.4999", locale)).toBe(
      localized("+€9.99", "+9,99 €", "+9,99 €"),
    );
  });

  it("preserves nulls, rate rounding and exact basis-point truncation", () => {
    expect(formatRate(null, locale)).toBe("—");
    expect(formatBasisPoints(null, locale)).toBe("—");
    expect(formatRate(2 / 3, locale)).toBe(localized("66.67%", "66,67 %", "66,67 %"));
    expect(formatRate(0, locale)).toBe(localized("0.00%", "0,00 %", "0,00 %"));
    expect(formatBasisPoints("125.999999999999", locale)).toBe(
      localized("1.25%", "1,25 %", "1,25 %"),
    );
    expect(formatBasisPoints("-0.5", locale)).toBe(localized("−0.00%", "−0,00 %", "−0,00 %"));
    expect(formatCount(1234567, locale)).toBe(localized("1,234,567", "1 234 567", "1.234.567"));
  });
});
