export type TradingReview = {
  id: string;
  traderId: string;
  reviewType: string;
  periodStart: string;
  periodEnd: string;
  summary: string | null;
  strengths: string | null;
  weaknesses: string | null;
  actionPlan: string | null;
  createdAt: string;
  updatedAt: string;
  tradeIds: string[];
  objectiveIds: string[];
};
export type CreateTradingReviewInput = {
  reviewType: string;
  periodStart: string;
  periodEnd: string;
  summary?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  actionPlan?: string | null;
  tradeIds?: string[];
  objectiveIds?: string[];
};
export type UpdateTradingReviewInput = Partial<CreateTradingReviewInput>;
export class TradingReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradingReviewValidationError";
  }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = (v: unknown, n: string) => {
  if (typeof v !== "string" || !v.trim())
    throw new TradingReviewValidationError(`${n} is required.`);
  return v.trim();
};
const optional = (v: unknown, n: string) => {
  if (v === undefined || v === null) return v;
  if (typeof v !== "string") throw new TradingReviewValidationError(`${n} must be a string.`);
  return v.trim() || null;
};
const date = (v: unknown, n: string) => {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ||
    new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) !== v
  )
    throw new TradingReviewValidationError(`${n} must be a valid YYYY-MM-DD date.`);
  return v;
};
const ids = (v: unknown, n: string) => {
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || !uuid.test(x)))
    throw new TradingReviewValidationError(`${n} must contain valid UUIDs.`);
  return [...new Set(v)];
};
export function validateCreateTradingReview(i: CreateTradingReviewInput): CreateTradingReviewInput {
  const periodStart = date(i.periodStart, "periodStart"),
    periodEnd = date(i.periodEnd, "periodEnd");
  if (periodEnd < periodStart)
    throw new TradingReviewValidationError("periodEnd must not precede periodStart.");
  return {
    reviewType: text(i.reviewType, "reviewType"),
    periodStart,
    periodEnd,
    ...(i.summary !== undefined ? { summary: optional(i.summary, "summary") } : {}),
    ...(i.strengths !== undefined ? { strengths: optional(i.strengths, "strengths") } : {}),
    ...(i.weaknesses !== undefined ? { weaknesses: optional(i.weaknesses, "weaknesses") } : {}),
    ...(i.actionPlan !== undefined ? { actionPlan: optional(i.actionPlan, "actionPlan") } : {}),
    ...(i.tradeIds !== undefined ? { tradeIds: ids(i.tradeIds, "tradeIds") } : {}),
    ...(i.objectiveIds !== undefined ? { objectiveIds: ids(i.objectiveIds, "objectiveIds") } : {}),
  };
}
export function validateUpdateTradingReview(i: UpdateTradingReviewInput): UpdateTradingReviewInput {
  const out: UpdateTradingReviewInput = {
    ...(i.reviewType !== undefined ? { reviewType: text(i.reviewType, "reviewType") } : {}),
    ...(i.periodStart !== undefined ? { periodStart: date(i.periodStart, "periodStart") } : {}),
    ...(i.periodEnd !== undefined ? { periodEnd: date(i.periodEnd, "periodEnd") } : {}),
    ...(i.summary !== undefined ? { summary: optional(i.summary, "summary") } : {}),
    ...(i.strengths !== undefined ? { strengths: optional(i.strengths, "strengths") } : {}),
    ...(i.weaknesses !== undefined ? { weaknesses: optional(i.weaknesses, "weaknesses") } : {}),
    ...(i.actionPlan !== undefined ? { actionPlan: optional(i.actionPlan, "actionPlan") } : {}),
    ...(i.tradeIds !== undefined ? { tradeIds: ids(i.tradeIds, "tradeIds") } : {}),
    ...(i.objectiveIds !== undefined ? { objectiveIds: ids(i.objectiveIds, "objectiveIds") } : {}),
  };
  if (
    out.periodStart !== undefined &&
    out.periodEnd !== undefined &&
    out.periodEnd < out.periodStart
  )
    throw new TradingReviewValidationError("periodEnd must not precede periodStart.");
  return out;
}
