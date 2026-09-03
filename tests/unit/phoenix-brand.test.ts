import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BrandLockup, BrandWordmark, PhoenixMark } from "@/components/ui/phoenix-mark";

describe("Phoenix brand components", () => {
  it("renders the approved canonical mark without the placeholder emoji", () => {
    const markup = renderToStaticMarkup(createElement(PhoenixMark));

    expect(markup).toContain("/brand/phoenix-mark-v1.png");
    expect(markup).toContain('data-brand-mark="phoenix-v1"');
    expect(markup).toContain('alt=""');
    expect(markup).not.toContain("🦅");
  });

  it("keeps the accessible Phoenix OS wordmark", () => {
    const markup = renderToStaticMarkup(createElement(BrandWordmark));

    expect(markup).toContain('aria-label="Phoenix OS"');
    expect(markup).toContain("Phoenix");
    expect(markup).toContain("OS");
  });

  it("uses the tagline only when requested", () => {
    expect(renderToStaticMarkup(createElement(BrandLockup))).not.toContain(
      "Process. Discipline. Evolve.",
    );
    expect(renderToStaticMarkup(createElement(BrandLockup, { tagline: true }))).toContain(
      "Process. Discipline. Evolve.",
    );
  });
});
