import { describe, expect, it } from "vitest";

import { localeFromAcceptLanguage, normalizeLocale, resolveLocalePreference } from "@/i18n/locale";

describe("locale resolution", () => {
  it.each([
    ["en-US", "en"],
    ["fr-FR", "fr"],
    ["es_MX", "es"],
    ["de-DE", null],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });

  it("respects Accept-Language quality and supported locales", () => {
    expect(localeFromAcceptLanguage("de-DE, es-ES;q=0.8, fr-FR;q=0.9")).toBe("fr");
  });

  it("uses Trader, cookie, browser and English in priority order", () => {
    expect(
      resolveLocalePreference({
        traderLocale: "es",
        cookieLocale: "fr",
        acceptLanguage: "en-US",
      }),
    ).toBe("es");
    expect(resolveLocalePreference({ cookieLocale: "fr", acceptLanguage: "es-ES" })).toBe("fr");
    expect(resolveLocalePreference({ acceptLanguage: "es-MX" })).toBe("es");
    expect(resolveLocalePreference({ acceptLanguage: "de-DE" })).toBe("en");
  });

  it("ignores unsupported persisted and cookie values", () => {
    expect(
      resolveLocalePreference({
        traderLocale: "de",
        cookieLocale: "it",
        acceptLanguage: "fr-CA",
      }),
    ).toBe("fr");
  });
});
