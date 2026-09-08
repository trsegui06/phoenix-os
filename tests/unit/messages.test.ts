import { describe, expect, it } from "vitest";

import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import fr from "@/i18n/messages/fr.json";

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
});
