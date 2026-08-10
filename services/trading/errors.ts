export type TradingAccountErrorCode =
  | "UNAUTHENTICATED"
  | "TRADER_PROFILE_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "TRADING_ACCOUNT_NOT_FOUND"
  | "CONFLICT"
  | "PERSISTENCE_ERROR";
export class TradingAccountApplicationError extends Error {
  constructor(
    public readonly code: TradingAccountErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TradingAccountApplicationError";
  }
}
