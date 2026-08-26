import type { CreateTradingReviewInput } from "@/domain/trading/trading-review";

export type ReviewFormState = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

const value = (form: FormData, name: string) => String(form.get(name) ?? "");
const optional = (form: FormData, name: string) => value(form, name).trim() || null;

export function parseReviewFormData(form: FormData): CreateTradingReviewInput {
  return {
    reviewType: value(form, "reviewType"),
    periodStart: value(form, "periodStart"),
    periodEnd: value(form, "periodEnd"),
    summary: optional(form, "summary"),
    strengths: optional(form, "strengths"),
    weaknesses: optional(form, "weaknesses"),
    actionPlan: optional(form, "actionPlan"),
    tradeIds: form.getAll("tradeIds").map(String),
    objectiveIds: form.getAll("objectiveIds").map(String),
  };
}
