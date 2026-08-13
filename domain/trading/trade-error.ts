export type TradeError = {
  id: string;
  tradeId: string;
  category: string;
  severity: string;
  description: string;
  solution: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTradeErrorInput = {
  tradeId: string;
  category: string;
  severity: string;
  description: string;
  solution?: string | null;
};

// The Trade relationship is deliberately immutable after creation.
export type UpdateTradeErrorInput = {
  category?: string;
  severity?: string;
  description?: string;
  solution?: string | null;
};

export class TradeErrorValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradeErrorValidationError";
  }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function required(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim())
    throw new TradeErrorValidationError(`${field} is required.`);
  return value.trim();
}

function tradeId(value: unknown) {
  if (typeof value !== "string" || !uuid.test(value))
    throw new TradeErrorValidationError("tradeId must be a valid UUID.");
  return value;
}

function optional(value: unknown) {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") throw new TradeErrorValidationError("solution must be a string.");
  return value.trim() || null;
}

export function validateCreateTradeError(input: CreateTradeErrorInput): CreateTradeErrorInput {
  return {
    tradeId: tradeId(input.tradeId),
    category: required(input.category, "category"),
    severity: required(input.severity, "severity"),
    description: required(input.description, "description"),
    ...(input.solution !== undefined ? { solution: optional(input.solution) } : {}),
  };
}

export function validateUpdateTradeError(input: UpdateTradeErrorInput): UpdateTradeErrorInput {
  return {
    ...(input.category !== undefined ? { category: required(input.category, "category") } : {}),
    ...(input.severity !== undefined ? { severity: required(input.severity, "severity") } : {}),
    ...(input.description !== undefined
      ? { description: required(input.description, "description") }
      : {}),
    ...(input.solution !== undefined ? { solution: optional(input.solution) } : {}),
  };
}
