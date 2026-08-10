export type TradingSetup = {
  id: string;
  traderId: string;
  name: string;
  timeframe: string;
  marketCondition: string | null;
  entryRules: string;
  exitRules: string;
  validationRules: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTradingSetupInput = {
  name: string;
  timeframe: string;
  marketCondition?: string | null;
  entryRules: string;
  exitRules: string;
  validationRules: string;
};

export type UpdateTradingSetupInput = {
  name?: string;
  timeframe?: string;
  marketCondition?: string | null;
  entryRules?: string;
  exitRules?: string;
  validationRules?: string;
};

export class TradingSetupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradingSetupValidationError";
  }
}

function required(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new TradingSetupValidationError(`${field} is required.`);
  return normalized;
}

function optional(value: string | null | undefined) {
  return value === undefined ? undefined : value === null ? null : value.trim() || null;
}

export function validateCreateTradingSetup(
  input: CreateTradingSetupInput,
): CreateTradingSetupInput {
  return {
    name: required(input.name, "name"),
    timeframe: required(input.timeframe, "timeframe"),
    marketCondition: optional(input.marketCondition),
    entryRules: required(input.entryRules, "entryRules"),
    exitRules: required(input.exitRules, "exitRules"),
    validationRules: required(input.validationRules, "validationRules"),
  };
}

export function validateUpdateTradingSetup(
  input: UpdateTradingSetupInput,
): UpdateTradingSetupInput {
  return {
    ...(input.name !== undefined ? { name: required(input.name, "name") } : {}),
    ...(input.timeframe !== undefined ? { timeframe: required(input.timeframe, "timeframe") } : {}),
    ...(input.marketCondition !== undefined
      ? { marketCondition: optional(input.marketCondition) }
      : {}),
    ...(input.entryRules !== undefined
      ? { entryRules: required(input.entryRules, "entryRules") }
      : {}),
    ...(input.exitRules !== undefined ? { exitRules: required(input.exitRules, "exitRules") } : {}),
    ...(input.validationRules !== undefined
      ? { validationRules: required(input.validationRules, "validationRules") }
      : {}),
  };
}
