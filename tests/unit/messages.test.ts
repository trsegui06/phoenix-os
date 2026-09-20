import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";

import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import fr from "@/i18n/messages/fr.json";
import { mergeWithEnglishFallback } from "@/i18n/config";

function keys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("translation dictionaries", () => {
  it("keeps French and Spanish structurally aligned with canonical English", () => {
    const canonical = keys(en).sort();
    expect(keys(fr).sort()).toEqual(canonical);
    expect(keys(es).sort()).toEqual(canonical);
  });

  it("uses canonical English when a localized key is missing", () => {
    expect(
      mergeWithEnglishFallback(
        { shell: { logout: "Logout", loading: "Loading" } },
        { shell: { logout: "Déconnexion" } },
      ),
    ).toEqual({ shell: { logout: "Déconnexion", loading: "Loading" } });
  });

  it("contains translated proof copy for shell, auth, and onboarding", () => {
    expect(fr.navigation.dashboard).toBe("Tableau de bord");
    expect(es.auth.login.submit).toBe("Iniciar sesión");
    expect(fr.onboarding.complete.title).toBe("Votre environnement de trading est prêt");
  });

  it.each([
    ["en", en, "1 affected trade", "2 affected trades", "1 closed · 2 unresolved"],
    ["fr", fr, "1 trade concerné", "2 trades concernés", "1 clôturé · 2 non résolus"],
    ["es", es, "1 operación afectada", "2 operaciones afectadas", "1 cerrada · 2 sin resolver"],
  ] as const)(
    "renders Dashboard ICU plurals and interpolation in %s",
    (locale, messages, one, many, counts) => {
      const t = createTranslator({ locale, messages, namespace: "dashboard" });
      expect(t("kpis.affectedTrades", { count: 1 })).toBe(one);
      expect(t("kpis.affectedTrades", { count: 2 })).toBe(many);
      expect(t("activity.tradeCounts", { closed: 1, unresolved: 2 })).toBe(counts);
      expect(t("kpis.outcomes", { wins: "1", losses: "2", breakeven: "3" })).toContain("3");
      expect(t("kpis.affectedTrades", { count: 0 })).not.toMatch(/[{}]|\(s\)/);
      expect(JSON.stringify(messages.dashboard)).not.toContain("(s)");
    },
  );
});
