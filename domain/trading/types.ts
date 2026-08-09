export type TradeDirection = "long" | "short";

export type TradingCoreOwnership = {
  id: string;
  traderId: string;
};

export type TradingAccountBalanceSnapshot = TradingCoreOwnership & {
  currency: string;
  initialBalanceCents: bigint;
  currentBalanceCents?: bigint;
  balanceUpdatedAt?: Date;
};

export type TradeReferences = TradingCoreOwnership & {
  sessionId: string;
  setupId: string;
  tradingAccountId: string;
  direction: TradeDirection;
  riskBasisPoints: number;
};
