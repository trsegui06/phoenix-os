import { parseMoneyToCents, TradeEntryValidationError } from "@/lib/trading-entry";

export class TradingSettingsFormError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradingSettingsFormError";
  }
}

const required = (form: FormData, name: string) => {
  const value = String(form.get(name) ?? "").trim();
  if (!value) throw new TradingSettingsFormError(`${name} is required.`);
  return value;
};

const optional = (form: FormData, name: string) => String(form.get(name) ?? "").trim() || null;

export function parseAccountMoney(value: string) {
  try {
    const cents = parseMoneyToCents(value);
    if (cents < 0) throw new TradingSettingsFormError("Balance must not be negative.");
    return cents;
  } catch (error) {
    if (error instanceof TradingSettingsFormError) throw error;
    if (error instanceof TradeEntryValidationError)
      throw new TradingSettingsFormError("Enter a balance with at most two decimals.");
    throw error;
  }
}

export function formatAccountMoney(cents: number) {
  const whole = Math.floor(cents / 100);
  return `${whole}.${String(cents % 100).padStart(2, "0")}`;
}

export function adaptCreateAccountForm(form: FormData) {
  return {
    propFirmId: null,
    accountName: required(form, "accountName"),
    broker: required(form, "broker"),
    accountType: required(form, "accountType"),
    currency: required(form, "currency").toUpperCase(),
    initialBalanceCents: parseAccountMoney(required(form, "initialBalance")),
    currentBalanceCents: null,
    balanceUpdatedAt: null,
    status: required(form, "status"),
  };
}

export function adaptUpdateAccountForm(form: FormData) {
  const balance = optional(form, "currentBalance");
  const updatedAt = optional(form, "balanceUpdatedAt");
  if ((balance === null) !== (updatedAt === null))
    throw new TradingSettingsFormError("Current balance and timestamp must be provided together.");
  const timestamp = updatedAt === null ? null : new Date(updatedAt);
  if (timestamp && Number.isNaN(timestamp.getTime()))
    throw new TradingSettingsFormError("Enter a valid balance timestamp.");
  return {
    accountName: required(form, "accountName"),
    broker: required(form, "broker"),
    accountType: required(form, "accountType"),
    status: required(form, "status"),
    currentBalanceCents: balance === null ? null : parseAccountMoney(balance),
    balanceUpdatedAt: timestamp === null ? null : timestamp.toISOString(),
  };
}

export function adaptCreateSessionForm(form: FormData) {
  return {
    sessionDate: required(form, "sessionDate"),
    sessionType: required(form, "sessionType"),
    marketBias: optional(form, "marketBias"),
    emotionalState: optional(form, "emotionalState"),
    notes: optional(form, "notes"),
  };
}

export const adaptUpdateSessionForm = adaptCreateSessionForm;

export function adaptCreateSetupForm(form: FormData) {
  return {
    name: required(form, "name"),
    timeframe: required(form, "timeframe"),
    marketCondition: optional(form, "marketCondition"),
    entryRules: required(form, "entryRules"),
    exitRules: required(form, "exitRules"),
    validationRules: required(form, "validationRules"),
  };
}

export const adaptUpdateSetupForm = adaptCreateSetupForm;
