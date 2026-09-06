import { createHash, randomUUID } from "node:crypto";

import type { Json } from "@/lib/supabase/database.types";
import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import { validateImportedTrade } from "@/domain/trading/trade-import";
import { CsvImportError, parseCsvBytes } from "@/lib/trading-import/csv-parser";
import { raiseGlobalAdapter } from "@/lib/trading-import/adapters/raiseglobal";
import type { NormalizedTradeImportCandidate } from "@/lib/trading-import/source-adapter";
import { resolveCurrentTraderId } from "./current-trader";
import { listTradingAccounts } from "./trading-accounts";
import { listTradingSessions } from "./trading-sessions";
import { listTradingSetups } from "./trading-setups";

export type TradeImportMapping = {
  tradingAccountId: string;
  setupId: string;
  asset: "XAUUSD";
  sessionIdsByDate: Record<string, string>;
};

export type TradeImportAnalysis = {
  fileHash: string;
  source: string;
  rowCount: number;
  uniqueTicketCount: number;
  signalGroupCount: number;
  sourceAccounts: string[];
  sourceSymbols: string[];
  tradeDates: string[];
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  warningCount: number;
};

export type TradeImportPreviewRow = NormalizedTradeImportCandidate & {
  mappedAsset: "XAUUSD";
  tradingAccountId: string;
  sessionId: string;
  setupId: string;
  riskStatus: "unknown";
  duplicate: boolean;
};

function parseCandidates(bytes: Uint8Array) {
  const csv = parseCsvBytes(bytes);
  if (
    csv.headers.length !== raiseGlobalAdapter.headers.length ||
    csv.headers.some((header, index) => header !== raiseGlobalAdapter.headers[index])
  )
    throw new CsvImportError("The CSV headers do not match the supported RaiseGlobal format.");
  const candidates = raiseGlobalAdapter.parse(csv.rows);
  const tickets = candidates.map((candidate) => candidate.externalTradeId);
  if (new Set(tickets).size !== tickets.length)
    throw new CsvImportError("The CSV contains duplicate source Tickets.");
  return candidates;
}

export function analyzeTradeImport(bytes: Uint8Array): TradeImportAnalysis {
  const candidates = parseCandidates(bytes);
  return {
    fileHash: createHash("sha256").update(bytes).digest("hex"),
    source: raiseGlobalAdapter.id,
    rowCount: candidates.length,
    uniqueTicketCount: new Set(candidates.map((candidate) => candidate.externalTradeId)).size,
    signalGroupCount: new Set(candidates.map((candidate) => candidate.signalGroup)).size,
    sourceAccounts: [...new Set(candidates.map((candidate) => candidate.externalAccountId))],
    sourceSymbols: [...new Set(candidates.map((candidate) => candidate.sourceSymbol))],
    tradeDates: [...new Set(candidates.map((candidate) => candidate.tradeDate))].sort(),
    winCount: candidates.filter((candidate) => candidate.result === "win").length,
    lossCount: candidates.filter((candidate) => candidate.result === "loss").length,
    breakevenCount: candidates.filter((candidate) => candidate.result === "breakeven").length,
    warningCount: candidates.reduce((count, candidate) => count + candidate.warnings.length, 0),
  };
}

async function validateMapping(
  client: PhoenixSupabaseClient,
  mapping: TradeImportMapping,
  dates: string[],
) {
  if (mapping.asset !== "XAUUSD") throw new CsvImportError("Confirm the Gold to XAUUSD mapping.");
  const [accounts, sessions, setups] = await Promise.all([
    listTradingAccounts(client),
    listTradingSessions(client),
    listTradingSetups(client),
  ]);
  if (!accounts.some((account) => account.id === mapping.tradingAccountId))
    throw new CsvImportError("Select an owned Phoenix Trading Account.");
  if (!setups.some((setup) => setup.id === mapping.setupId))
    throw new CsvImportError("Select an owned Phoenix Setup.");
  for (const date of dates) {
    const session = sessions.find((candidate) => candidate.id === mapping.sessionIdsByDate[date]);
    if (!session || session.sessionDate !== date)
      throw new CsvImportError(`Select an owned Phoenix Session dated ${date}.`);
  }
}

async function duplicateTickets(
  client: PhoenixSupabaseClient,
  mapping: TradeImportMapping,
  candidates: NormalizedTradeImportCandidate[],
) {
  const first = candidates[0]!;
  const { data, error } = await client
    .from("trades")
    .select("external_trade_id")
    .eq("trading_account_id", mapping.tradingAccountId)
    .eq("import_source", first.source)
    .eq("external_account_id", first.externalAccountId)
    .in(
      "external_trade_id",
      candidates.map((candidate) => candidate.externalTradeId),
    );
  if (error) throw new CsvImportError("Existing imported Trades could not be checked.");
  return new Set((data ?? []).map((row) => row.external_trade_id).filter(Boolean));
}

export async function previewTradeImport(
  client: PhoenixSupabaseClient,
  bytes: Uint8Array,
  expectedHash: string,
  mapping: TradeImportMapping,
) {
  await resolveCurrentTraderId(client);
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== expectedHash)
    throw new CsvImportError("The selected CSV changed after analysis.");
  const candidates = parseCandidates(bytes);
  const dates = [...new Set(candidates.map((candidate) => candidate.tradeDate))];
  await validateMapping(client, mapping, dates);
  const duplicates = await duplicateTickets(client, mapping, candidates);
  return candidates.map((candidate): TradeImportPreviewRow => ({
    ...candidate,
    mappedAsset: mapping.asset,
    tradingAccountId: mapping.tradingAccountId,
    sessionId: mapping.sessionIdsByDate[candidate.tradeDate]!,
    setupId: mapping.setupId,
    riskStatus: "unknown",
    duplicate: duplicates.has(candidate.externalTradeId),
  }));
}

export async function executeTradeImport(
  client: PhoenixSupabaseClient,
  bytes: Uint8Array,
  expectedHash: string,
  mapping: TradeImportMapping,
) {
  const rows = await previewTradeImport(client, bytes, expectedHash, mapping);
  const batchId = randomUUID();
  const summary = { imported: 0, duplicates: 0, rejected: 0, failed: 0, reasons: [] as string[] };
  for (const row of rows) {
    if (row.duplicate) {
      summary.duplicates += 1;
      continue;
    }
    const trade = validateImportedTrade({
      tradingAccountId: row.tradingAccountId,
      sessionId: row.sessionId,
      setupId: row.setupId,
      tradeDate: row.tradeDate,
      asset: row.mappedAsset,
      direction: row.direction,
      entryPrice: Number(row.entryPrice),
      stopLoss: Number(row.stopLoss),
      takeProfit: Number(row.takeProfit),
      exitPrice: Number(row.exitPrice),
      riskBasisPoints: null,
      positionSize: Number(row.positionSize),
      result: row.result,
      pnlCents: row.pnlCents,
      notes: row.sourceComment,
      screenshots: [],
      provenance: {
        source: row.source,
        externalAccountId: row.externalAccountId,
        externalTradeId: row.externalTradeId,
        batchId,
        metadata: {
          sourceBroker: row.sourceBroker,
          sourceSymbol: row.sourceSymbol,
          openedAt: row.openedAt,
          closedAt: row.closedAt,
          sourceComment: row.sourceComment,
          tpLeg: row.tpLeg,
          signalGroup: row.signalGroup,
          fileHash: expectedHash,
        },
      },
    });
    const { data, error } = await client.rpc("create_trade_with_errors", {
      target_trading_account_id: trade.tradingAccountId,
      target_session_id: trade.sessionId,
      target_setup_id: trade.setupId,
      target_trade_date: trade.tradeDate,
      target_asset: trade.asset,
      target_direction: trade.direction,
      target_entry_price: trade.entryPrice,
      target_stop_loss: trade.stopLoss,
      target_take_profit: trade.takeProfit,
      // Supabase's generator cannot express nullable PostgreSQL function arguments.
      target_risk_basis_points: null as never,
      target_position_size: trade.positionSize,
      target_result: trade.result,
      target_exit_price: trade.exitPrice ?? undefined,
      target_pnl_cents: trade.pnlCents ?? undefined,
      target_notes: trade.notes ?? undefined,
      target_errors: [],
      target_import_source: trade.provenance.source,
      target_external_account_id: trade.provenance.externalAccountId,
      target_external_trade_id: trade.provenance.externalTradeId,
      target_import_batch_id: trade.provenance.batchId,
      target_import_metadata: trade.provenance.metadata as Json,
    });
    if (!error && data) summary.imported += 1;
    else if (error?.code === "23505") summary.duplicates += 1;
    else {
      summary.failed += 1;
      summary.reasons.push(`Ticket ${row.externalTradeId}: could not be imported.`);
    }
  }
  return summary;
}
