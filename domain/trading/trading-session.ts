export type TradingSession = {
  id: string;
  traderId: string;
  sessionDate: string;
  sessionType: string;
  marketBias: string | null;
  emotionalState: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
export type CreateTradingSessionInput = {
  sessionDate: string;
  sessionType: string;
  marketBias?: string | null;
  emotionalState?: string | null;
  notes?: string | null;
};
export type UpdateTradingSessionInput = {
  sessionDate?: string;
  sessionType?: string;
  marketBias?: string | null;
  emotionalState?: string | null;
  notes?: string | null;
};
export class TradingSessionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradingSessionValidationError";
  }
}
const required = (v: string, n: string) => {
  const x = v.trim();
  if (!x) throw new TradingSessionValidationError(`${n} is required.`);
  return x;
};
const optional = (v: string | null | undefined) =>
  v === undefined ? undefined : v === null ? null : v.trim() || null;
const date = (v: string) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ||
    new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) !== v
  )
    throw new TradingSessionValidationError("sessionDate must be a valid YYYY-MM-DD date.");
  return v;
};
export function validateCreateTradingSession(
  i: CreateTradingSessionInput,
): CreateTradingSessionInput {
  return {
    sessionDate: date(i.sessionDate),
    sessionType: required(i.sessionType, "sessionType"),
    marketBias: optional(i.marketBias),
    emotionalState: optional(i.emotionalState),
    notes: optional(i.notes),
  };
}
export function validateUpdateTradingSession(
  i: UpdateTradingSessionInput,
): UpdateTradingSessionInput {
  return {
    ...(i.sessionDate !== undefined ? { sessionDate: date(i.sessionDate) } : {}),
    ...(i.sessionType !== undefined ? { sessionType: required(i.sessionType, "sessionType") } : {}),
    ...(i.marketBias !== undefined ? { marketBias: optional(i.marketBias) } : {}),
    ...(i.emotionalState !== undefined ? { emotionalState: optional(i.emotionalState) } : {}),
    ...(i.notes !== undefined ? { notes: optional(i.notes) } : {}),
  };
}
