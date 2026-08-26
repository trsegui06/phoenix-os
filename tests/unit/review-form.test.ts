import { describe, expect, it } from "vitest";

import { parseReviewFormData } from "@/lib/trading/review-form";

describe("Review form adapter", () => {
  it("maps narrative fields and repeated owned relation selections", () => {
    const form = new FormData();
    form.set("reviewType", "Weekly");
    form.set("periodStart", "2026-08-01");
    form.set("periodEnd", "2026-08-07");
    form.set("summary", "  Calm execution  ");
    form.append("tradeIds", "11111111-1111-4111-8111-111111111111");
    form.append("tradeIds", "22222222-2222-4222-8222-222222222222");
    form.append("objectiveIds", "33333333-3333-4333-8333-333333333333");

    expect(parseReviewFormData(form)).toEqual({
      reviewType: "Weekly",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-07",
      summary: "Calm execution",
      strengths: null,
      weaknesses: null,
      actionPlan: null,
      tradeIds: ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"],
      objectiveIds: ["33333333-3333-4333-8333-333333333333"],
    });
  });

  it("allows a Review without Trades or Objectives", () => {
    const form = new FormData();
    form.set("reviewType", "Monthly");
    form.set("periodStart", "2026-08-01");
    form.set("periodEnd", "2026-08-31");

    expect(parseReviewFormData(form)).toMatchObject({ tradeIds: [], objectiveIds: [] });
  });
});
