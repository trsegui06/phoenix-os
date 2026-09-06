export type NormalizedTradeImportCandidate = {
  rowNumber: number;
  source: string;
  sourceBroker: string;
  externalAccountId: string;
  externalTradeId: string;
  openedAt: string;
  closedAt: string;
  tradeDate: string;
  sourceSymbol: string;
  direction: "long" | "short";
  positionSize: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  exitPrice: string;
  pnlCents: number;
  result: "win" | "loss" | "breakeven";
  sourceComment: string;
  tpLeg: "TP1" | "TP2" | "TP3";
  signalGroup: string;
  warnings: string[];
};

export type TradeImportSourceAdapter = {
  id: string;
  headers: readonly string[];
  parse(rows: Record<string, string>[]): NormalizedTradeImportCandidate[];
};
