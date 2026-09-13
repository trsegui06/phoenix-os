import { describe, expect, it } from "vitest";

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
});
