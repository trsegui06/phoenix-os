export type TradingAccount = {
  id: string;
  traderId: string;
  propFirmId: string | null;
  broker: string;
  accountName: string;
  accountType: string;
  currency: string;
  initialBalanceCents: number;
  currentBalanceCents: number | null;
  balanceUpdatedAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};
export type CreateTradingAccountInput = {
  propFirmId?: string | null;
  broker: string;
  accountName: string;
  accountType: string;
  currency: string;
  initialBalanceCents: number;
  currentBalanceCents?: number | null;
  balanceUpdatedAt?: string | null;
  status: string;
};
export type UpdateTradingAccountInput = {
  propFirmId?: string | null;
  broker?: string;
  accountName?: string;
  accountType?: string;
  currency?: string;
  initialBalanceCents?: number;
  currentBalanceCents?: number | null;
  balanceUpdatedAt?: string | null;
  status?: string;
};
export class TradingAccountValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradingAccountValidationError";
  }
}
const text = (value: string, field: string) => {
  const result = value.trim();
  if (!result) throw new TradingAccountValidationError(`${field} is required.`);
  return result;
};
const cents = (value: number, field: string) => {
  if (!Number.isInteger(value) || value < 0)
    throw new TradingAccountValidationError(`${field} must be a non-negative integer.`);
  return value;
};
const code = (value: string) => {
  const result = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(result))
    throw new TradingAccountValidationError("currency must be a three-letter ASCII code.");
  return result;
};
const snapshot = (amount: number | null, at: string | null) => {
  if ((amount === null) !== (at === null))
    throw new TradingAccountValidationError(
      "currentBalanceCents and balanceUpdatedAt must be provided together.",
    );
};
export function validateCreateTradingAccount(
  input: CreateTradingAccountInput,
): CreateTradingAccountInput {
  const currentBalanceCents = input.currentBalanceCents ?? null;
  const balanceUpdatedAt = input.balanceUpdatedAt ?? null;
  if (currentBalanceCents !== null) cents(currentBalanceCents, "currentBalanceCents");
  if (balanceUpdatedAt !== null && Number.isNaN(Date.parse(balanceUpdatedAt)))
    throw new TradingAccountValidationError("balanceUpdatedAt must be a valid timestamp.");
  snapshot(currentBalanceCents, balanceUpdatedAt);
  return {
    propFirmId: input.propFirmId ?? null,
    broker: text(input.broker, "broker"),
    accountName: text(input.accountName, "accountName"),
    accountType: text(input.accountType, "accountType"),
    currency: code(input.currency),
    initialBalanceCents: cents(input.initialBalanceCents, "initialBalanceCents"),
    currentBalanceCents,
    balanceUpdatedAt,
    status: text(input.status, "status"),
  };
}
export function validateUpdateTradingAccount(
  input: UpdateTradingAccountInput,
): UpdateTradingAccountInput {
  const output = { ...input };
  if (output.broker !== undefined) output.broker = text(output.broker, "broker");
  if (output.accountName !== undefined)
    output.accountName = text(output.accountName, "accountName");
  if (output.accountType !== undefined)
    output.accountType = text(output.accountType, "accountType");
  if (output.status !== undefined) output.status = text(output.status, "status");
  if (output.currency !== undefined) output.currency = code(output.currency);
  if (output.initialBalanceCents !== undefined)
    output.initialBalanceCents = cents(output.initialBalanceCents, "initialBalanceCents");
  if (output.currentBalanceCents !== undefined && output.currentBalanceCents !== null)
    cents(output.currentBalanceCents, "currentBalanceCents");
  if (
    output.balanceUpdatedAt !== undefined &&
    output.balanceUpdatedAt !== null &&
    Number.isNaN(Date.parse(output.balanceUpdatedAt))
  )
    throw new TradingAccountValidationError("balanceUpdatedAt must be a valid timestamp.");
  if ((output.currentBalanceCents === null) !== (output.balanceUpdatedAt === null))
    throw new TradingAccountValidationError(
      "currentBalanceCents and balanceUpdatedAt must be cleared together.",
    );
  return output;
}
