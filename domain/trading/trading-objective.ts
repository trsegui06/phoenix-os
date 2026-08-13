export type TradingObjective = {
  id: string;
  traderId: string;
  title: string;
  description: string | null;
  category: string | null;
  targetDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTradingObjectiveInput = {
  title: string;
  description?: string | null;
  category?: string | null;
  targetDate?: string | null;
  status: string;
};

export type UpdateTradingObjectiveInput = {
  title?: string;
  description?: string | null;
  category?: string | null;
  targetDate?: string | null;
  status?: string;
};

export class TradingObjectiveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradingObjectiveValidationError";
  }
}

function required(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim())
    throw new TradingObjectiveValidationError(`${field} is required.`);
  return value.trim();
}

function optional(value: unknown, field: string) {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string")
    throw new TradingObjectiveValidationError(`${field} must be a string.`);
  return value.trim() || null;
}

function date(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  )
    throw new TradingObjectiveValidationError("targetDate must be a valid YYYY-MM-DD date.");
  return value;
}

export function validateCreateTradingObjective(
  input: CreateTradingObjectiveInput,
): CreateTradingObjectiveInput {
  return {
    title: required(input.title, "title"),
    status: required(input.status, "status"),
    ...(input.description !== undefined
      ? { description: optional(input.description, "description") }
      : {}),
    ...(input.category !== undefined ? { category: optional(input.category, "category") } : {}),
    ...(input.targetDate !== undefined
      ? { targetDate: input.targetDate === null ? null : date(input.targetDate) }
      : {}),
  };
}

export function validateUpdateTradingObjective(
  input: UpdateTradingObjectiveInput,
): UpdateTradingObjectiveInput {
  return {
    ...(input.title !== undefined ? { title: required(input.title, "title") } : {}),
    ...(input.status !== undefined ? { status: required(input.status, "status") } : {}),
    ...(input.description !== undefined
      ? { description: optional(input.description, "description") }
      : {}),
    ...(input.category !== undefined ? { category: optional(input.category, "category") } : {}),
    ...(input.targetDate !== undefined
      ? { targetDate: input.targetDate === null ? null : date(input.targetDate) }
      : {}),
  };
}
