export type Trade = {
  id: string;
  traderId: string;
  sessionId: string;
  setupId: string;
  tradingAccountId: string;
  tradeDate: string;
  asset: string;
  direction: "long" | "short";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice: number | null;
  riskBasisPoints: number;
  positionSize: number;
  result: string;
  pnlCents: number | null;
  executionQuality: string | null;
  screenshots: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTradeInput = {
  sessionId: string;
  setupId: string;
  tradingAccountId: string;
  tradeDate: string;
  asset: string;
  direction: "long" | "short";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice?: number | null;
  riskBasisPoints: number;
  positionSize: number;
  result: string;
  pnlCents?: number | null;
  executionQuality?: string | null;
  screenshots?: string[];
  notes?: string | null;
};

export type UpdateTradeInput = {
  sessionId?: string;
  setupId?: string;
  tradingAccountId?: string;
  tradeDate?: string;
  asset?: string;
  direction?: "long" | "short";
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  exitPrice?: number | null;
  riskBasisPoints?: number;
  positionSize?: number;
  result?: string;
  pnlCents?: number | null;
  executionQuality?: string | null;
  screenshots?: string[];
  notes?: string | null;
};

export class TradeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradeValidationError";
  }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function required(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim())
    throw new TradeValidationError(`${field} is required.`);
  return value.trim();
}

function id(value: unknown, field: string) {
  if (typeof value !== "string" || !uuid.test(value))
    throw new TradeValidationError(`${field} must be a valid UUID.`);
  return value;
}

function date(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  )
    throw new TradeValidationError("tradeDate must be a valid YYYY-MM-DD date.");
  return value;
}

function decimal(value: unknown, field: string, minimum: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum)
    throw new TradeValidationError(
      `${field} must be a finite number greater than or equal to ${minimum}.`,
    );
  return value;
}

function positiveDecimal(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    throw new TradeValidationError(`${field} must be a finite number greater than 0.`);
  return value;
}

function direction(value: unknown) {
  if (typeof value !== "string" || !["long", "short"].includes(value.toLowerCase()))
    throw new TradeValidationError("direction must be long or short.");
  return value.toLowerCase() as "long" | "short";
}

function risk(value: unknown) {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 10_000)
    throw new TradeValidationError("riskBasisPoints must be an integer from 0 to 10000.");
  return value as number;
}

function cents(value: unknown) {
  if (!Number.isSafeInteger(value))
    throw new TradeValidationError("pnlCents must be a safe integer.");
  return value as number;
}

function optionalText(value: unknown) {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") throw new TradeValidationError("text must be a string.");
  return value.trim() || null;
}

function screenshots(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.some((reference) => typeof reference !== "string" || !reference.trim())
  )
    throw new TradeValidationError("screenshots must contain non-empty string references.");
  return value.map((reference) => reference.trim());
}

function createFields(input: CreateTradeInput) {
  return {
    sessionId: id(input.sessionId, "sessionId"),
    setupId: id(input.setupId, "setupId"),
    tradingAccountId: id(input.tradingAccountId, "tradingAccountId"),
    tradeDate: date(input.tradeDate),
    asset: required(input.asset, "asset"),
    direction: direction(input.direction),
    entryPrice: positiveDecimal(input.entryPrice, "entryPrice"),
    stopLoss: decimal(input.stopLoss, "stopLoss", 0),
    takeProfit: decimal(input.takeProfit, "takeProfit", 0),
    riskBasisPoints: risk(input.riskBasisPoints),
    positionSize: positiveDecimal(input.positionSize, "positionSize"),
    result: required(input.result, "result"),
  };
}

export function validateCreateTrade(input: CreateTradeInput): CreateTradeInput {
  return {
    ...createFields(input),
    ...(input.exitPrice !== undefined
      ? { exitPrice: input.exitPrice === null ? null : decimal(input.exitPrice, "exitPrice", 0) }
      : {}),
    ...(input.pnlCents !== undefined
      ? { pnlCents: input.pnlCents === null ? null : cents(input.pnlCents) }
      : {}),
    ...(input.executionQuality !== undefined
      ? { executionQuality: optionalText(input.executionQuality) }
      : {}),
    ...(input.screenshots !== undefined ? { screenshots: screenshots(input.screenshots) } : {}),
    ...(input.notes !== undefined ? { notes: optionalText(input.notes) } : {}),
  };
}

export function validateUpdateTrade(input: UpdateTradeInput): UpdateTradeInput {
  return {
    ...(input.sessionId !== undefined ? { sessionId: id(input.sessionId, "sessionId") } : {}),
    ...(input.setupId !== undefined ? { setupId: id(input.setupId, "setupId") } : {}),
    ...(input.tradingAccountId !== undefined
      ? { tradingAccountId: id(input.tradingAccountId, "tradingAccountId") }
      : {}),
    ...(input.tradeDate !== undefined ? { tradeDate: date(input.tradeDate) } : {}),
    ...(input.asset !== undefined ? { asset: required(input.asset, "asset") } : {}),
    ...(input.direction !== undefined ? { direction: direction(input.direction) } : {}),
    ...(input.entryPrice !== undefined
      ? { entryPrice: positiveDecimal(input.entryPrice, "entryPrice") }
      : {}),
    ...(input.stopLoss !== undefined ? { stopLoss: decimal(input.stopLoss, "stopLoss", 0) } : {}),
    ...(input.takeProfit !== undefined
      ? { takeProfit: decimal(input.takeProfit, "takeProfit", 0) }
      : {}),
    ...(input.exitPrice !== undefined
      ? { exitPrice: input.exitPrice === null ? null : decimal(input.exitPrice, "exitPrice", 0) }
      : {}),
    ...(input.riskBasisPoints !== undefined
      ? { riskBasisPoints: risk(input.riskBasisPoints) }
      : {}),
    ...(input.positionSize !== undefined
      ? { positionSize: positiveDecimal(input.positionSize, "positionSize") }
      : {}),
    ...(input.result !== undefined ? { result: required(input.result, "result") } : {}),
    ...(input.pnlCents !== undefined
      ? { pnlCents: input.pnlCents === null ? null : cents(input.pnlCents) }
      : {}),
    ...(input.executionQuality !== undefined
      ? { executionQuality: optionalText(input.executionQuality) }
      : {}),
    ...(input.screenshots !== undefined ? { screenshots: screenshots(input.screenshots) } : {}),
    ...(input.notes !== undefined ? { notes: optionalText(input.notes) } : {}),
  };
}
