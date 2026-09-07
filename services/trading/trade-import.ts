import { createHash, randomUUID } from "node:crypto";

import type {
  HistoricalSessionPlan,
  HistoricalSessionResult,
} from "@/domain/trading/historical-session";
import { validateImportedTrade } from "@/domain/trading/trade-import";
import type { Json } from "@/lib/supabase/database.types";
import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import { raiseGlobalAdapter } from "@/lib/trading-import/adapters/raiseglobal";
import { CsvImportError, parseCsvBytes } from "@/lib/trading-import/csv-parser";
import type { NormalizedTradeImportCandidate } from "@/lib/trading-import/source-adapter";
import { resolveCurrentTraderId } from "./current-trader";
import { planHistoricalSessions, resolveHistoricalSessions } from "./historical-sessions";
import { listTradingAccounts } from "./trading-accounts";
import { listTradingSetups } from "./trading-setups";

export type TradeImportMapping = {
  tradingAccountId: string;
  setupId: string;
  asset: "XAUUSD";
  historicalSessionType: string;
  selectedSessionIdsByDate: Record<string, string>;
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
  sessionId: string | null;
  sessionType: string;
  sessionStatus: "Existing" | "Will create" | "Action required";
  setupId: string;
  riskStatus: "unknown";
  duplicate: boolean;
};

export type TradeImportPreview = {
  sessionPlan: HistoricalSessionPlan;
  rows: TradeImportPreviewRow[];
};

export type TradeImportExecutionSummary = {
  sessions: HistoricalSessionResult;
  trades: {
    imported: number;
    duplicates: number;
    rejected: number;
    failed: number;
    reasons: string[];
  };
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

async function validateContext(client: PhoenixSupabaseClient, mapping: TradeImportMapping) {
  if (mapping.asset !== "XAUUSD") throw new CsvImportError("Confirm the Gold to XAUUSD mapping.");
  const [accounts, setups] = await Promise.all([
    listTradingAccounts(client),
    listTradingSetups(client),
  ]);
  if (!accounts.some((account) => account.id === mapping.tradingAccountId))
    throw new CsvImportError("Select an owned Phoenix Trading Account.");
  if (!setups.some((setup) => setup.id === mapping.setupId))
    throw new CsvImportError("Select an owned Phoenix Setup.");
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
  return new Set(
    (data ?? [])
      .map((row) => row.external_trade_id)
      .filter((ticket): ticket is string => Boolean(ticket)),
  );
}

function checkedCandidates(bytes: Uint8Array, expectedHash: string) {
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== expectedHash)
    throw new CsvImportError("The selected CSV changed after analysis.");
  return parseCandidates(bytes);
}

function previewRows(
  candidates: NormalizedTradeImportCandidate[],
  mapping: TradeImportMapping,
  sessionPlan: HistoricalSessionPlan,
  duplicates: Set<string>,
): TradeImportPreviewRow[] {
  return candidates.map((candidate) => {
    const resolution = sessionPlan.resolutions.find((item) => item.date === candidate.tradeDate)!;
    const selected =
      resolution.state === "ambiguous" && resolution.selectedSessionId
        ? resolution.candidates.find((item) => item.id === resolution.selectedSessionId)
        : null;
    const session = resolution.state === "existing" ? resolution.session : selected;
    return {
      ...candidate,
      mappedAsset: mapping.asset,
      tradingAccountId: mapping.tradingAccountId,
      sessionId: session?.id ?? null,
      sessionType:
        session?.sessionType ??
        (resolution.state === "to-create"
          ? resolution.proposedSessionType
          : "Select an existing Session"),
      sessionStatus: session
        ? "Existing"
        : resolution.state === "to-create"
          ? "Will create"
          : "Action required",
      setupId: mapping.setupId,
      riskStatus: "unknown",
      duplicate: duplicates.has(candidate.externalTradeId),
    };
  });
}

export async function previewTradeImport(
  client: PhoenixSupabaseClient,
  bytes: Uint8Array,
  expectedHash: string,
  mapping: TradeImportMapping,
): Promise<TradeImportPreview> {
  await resolveCurrentTraderId(client);
  const candidates = checkedCandidates(bytes, expectedHash);
  const dates = [...new Set(candidates.map((candidate) => candidate.tradeDate))];
  await validateContext(client, mapping);
  const [sessionPlan, duplicates] = await Promise.all([
    planHistoricalSessions(
      client,
      dates,
      mapping.historicalSessionType,
      mapping.selectedSessionIdsByDate,
    ),
    duplicateTickets(client, mapping, candidates),
  ]);
  return { sessionPlan, rows: previewRows(candidates, mapping, sessionPlan, duplicates) };
}

export async function executeTradeImport(
  client: PhoenixSupabaseClient,
  bytes: Uint8Array,
  expectedHash: string,
  mapping: TradeImportMapping,
): Promise<TradeImportExecutionSummary> {
  await resolveCurrentTraderId(client);
  const candidates = checkedCandidates(bytes, expectedHash);
  const dates = [...new Set(candidates.map((candidate) => candidate.tradeDate))];
  await validateContext(client, mapping);
  const batchId = randomUUID();
  const sessions = await resolveHistoricalSessions(client, {
    dates,
    sessionType: mapping.historicalSessionType,
    importBatchId: batchId,
    selectedSessionIdsByDate: mapping.selectedSessionIdsByDate,
  });
  const duplicates = await duplicateTickets(client, mapping, candidates);
  const trades = {
    imported: 0,
    duplicates: 0,
    rejected: 0,
    failed: 0,
    reasons: [] as string[],
  };
  for (const row of candidates) {
    if (duplicates.has(row.externalTradeId)) {
      trades.duplicates += 1;
      continue;
    }
    const sessionId = sessions.mappings[row.tradeDate];
    if (!sessionId) {
      trades.rejected += 1;
      trades.reasons.push(`Ticket ${row.externalTradeId}: Session resolution is missing.`);
      continue;
    }
    const trade = validateImportedTrade({
      tradingAccountId: mapping.tradingAccountId,
      sessionId,
      setupId: mapping.setupId,
      tradeDate: row.tradeDate,
      asset: mapping.asset,
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
    if (!error && data) trades.imported += 1;
    else if (error?.code === "23505") trades.duplicates += 1;
    else {
      trades.failed += 1;
      trades.reasons.push(`Ticket ${row.externalTradeId}: could not be imported.`);
    }
  }
  return { sessions, trades };
}
