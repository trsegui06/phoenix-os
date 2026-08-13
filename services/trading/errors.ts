export type TradingApplicationErrorCode =
  | "UNAUTHENTICATED"
  | "TRADER_PROFILE_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "TRADING_ACCOUNT_NOT_FOUND"
  | "TRADING_SESSION_NOT_FOUND"
  | "TRADING_SETUP_NOT_FOUND"
  | "TRADING_TRADE_NOT_FOUND"
  | "TRADING_TRADE_ERROR_NOT_FOUND"
  | "TRADING_OBJECTIVE_NOT_FOUND"
  | "TRADING_REVIEW_NOT_FOUND"
  | "CONFLICT"
  | "PERSISTENCE_ERROR";
export class TradingApplicationError extends Error {
  constructor(
    public readonly code: TradingApplicationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TradingApplicationError";
  }
}

export type TradingAccountErrorCode = TradingApplicationErrorCode;
export const TradingAccountApplicationError = TradingApplicationError;
