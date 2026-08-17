import {
  TradeValidationError,
  validateCreateTrade,
  type CreateTradeInput,
} from "@/domain/trading/trade";
import { TradeErrorValidationError, validateCreateTradeError } from "@/domain/trading/trade-error";

export class TradeEntryValidationError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(message);
    this.name = "TradeEntryValidationError";
  }
}
export function parseRiskPercent(value: string) {
  if (!/^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/.test(value.trim()))
    throw new TradeEntryValidationError(
      "riskPercent",
      "Enter a percentage from 0 to 100 with at most two decimals.",
    );
  const [whole, fraction = ""] = value.trim().split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export function parseMoneyToCents(value: string) {
  const input = value.trim();
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(input))
    throw new TradeEntryValidationError(
      "pnl",
      "Enter a monetary amount with at most two decimals.",
    );
  const negative = input.startsWith("-");
  const [whole, fraction = ""] = (negative ? input.slice(1) : input).split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  const signed = negative ? -cents : cents;
  const number = Number(signed);
  if (!Number.isSafeInteger(number))
    throw new TradeEntryValidationError("pnl", "The monetary amount is too large.");
  return number;
}
export function parseDecimalInput(value: string, field: string, allowZero = false) {
  const input = value.trim();
  if (!/^\d+(?:\.\d{1,8})?$/.test(input))
    throw new TradeEntryValidationError(
      field,
      "Enter a valid decimal with at most eight decimal places.",
    );
  const number = Number(input);
  if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0))
    throw new TradeEntryValidationError(field, "Enter a valid positive value.");
  return number;
}
export type TradeEntryErrorInput = {
  category: string;
  severity: string;
  description: string;
  solution?: string | null;
};
export type TradeEntryInput = {
  tradingAccountId: string;
  sessionId: string;
  setupId: string;
  tradeDate: string;
  asset: string;
  direction: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  exitPrice: string;
  riskPercent: string;
  positionSize: string;
  result: string;
  pnl: string;
  executionQuality: string;
  notes: string;
  errors: TradeEntryErrorInput[];
};
export function adaptTradeEntry(input: TradeEntryInput) {
  let trade: CreateTradeInput;
  try {
    trade = validateCreateTrade({
      tradingAccountId: input.tradingAccountId,
      sessionId: input.sessionId,
      setupId: input.setupId,
      tradeDate: input.tradeDate,
      asset: input.asset,
      direction: input.direction as "long" | "short",
      entryPrice: parseDecimalInput(input.entryPrice, "entryPrice"),
      stopLoss: parseDecimalInput(input.stopLoss, "stopLoss", true),
      takeProfit: parseDecimalInput(input.takeProfit, "takeProfit", true),
      ...(input.exitPrice.trim()
        ? { exitPrice: parseDecimalInput(input.exitPrice, "exitPrice", true) }
        : {}),
      riskBasisPoints: parseRiskPercent(input.riskPercent),
      positionSize: parseDecimalInput(input.positionSize, "positionSize"),
      result: input.result,
      ...(input.pnl.trim() ? { pnlCents: parseMoneyToCents(input.pnl) } : { pnlCents: null }),
      executionQuality: input.executionQuality,
      notes: input.notes,
      screenshots: [],
    });
  } catch (error) {
    if (error instanceof TradeValidationError) {
      const field = error.message.match(/^(\w+)/)?.[1] ?? "form";
      throw new TradeEntryValidationError(field, error.message);
    }
    throw error;
  }
  const errors = input.errors.map((e, index) => {
    try {
      const v = validateCreateTradeError({
        tradeId: "00000000-0000-4000-8000-000000000000",
        ...e,
      });
      return {
        category: v.category,
        severity: v.severity,
        description: v.description,
        solution: v.solution ?? null,
      };
    } catch (error) {
      if (error instanceof TradeErrorValidationError)
        throw new TradeEntryValidationError("errors", `Trade Error ${index + 1}: ${error.message}`);
      throw error;
    }
  });
  return { trade, errors };
}
