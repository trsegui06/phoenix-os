import { TradingSessionRepository } from "@/data/trading/trading-session-repository";
import {
  buildHistoricalSessionPlan,
  normalizeHistoricalSessionDates,
  validateHistoricalSessionType,
  type HistoricalSessionResult,
} from "@/domain/trading/historical-session";
import type { PhoenixSupabaseClient } from "@/lib/supabase/types";
import { CsvImportError } from "@/lib/trading-import/csv-parser";
import { resolveCurrentTraderId } from "./current-trader";

const safe = <T>(operation: () => T) => {
  try {
    return operation();
  } catch (error) {
    throw new CsvImportError(
      error instanceof Error ? error.message : "Historical Sessions are invalid.",
    );
  }
};

export async function planHistoricalSessions(
  client: PhoenixSupabaseClient,
  dates: string[],
  sessionType: string,
  selectedSessionIdsByDate: Record<string, string>,
) {
  await resolveCurrentTraderId(client);
  const normalized = safe(() => normalizeHistoricalSessionDates(dates));
  const repository = new TradingSessionRepository(client);
  const result = await repository.listByDatesForCurrentTrader(normalized);
  if (result.error || !result.sessions)
    throw new CsvImportError("Owned Phoenix Sessions could not be resolved.");
  const sessions = result.sessions;
  return safe(() =>
    buildHistoricalSessionPlan(normalized, sessions, sessionType, selectedSessionIdsByDate),
  );
}

export async function resolveHistoricalSessions(
  client: PhoenixSupabaseClient,
  input: {
    dates: string[];
    sessionType: string;
    importBatchId: string;
    selectedSessionIdsByDate: Record<string, string>;
  },
): Promise<HistoricalSessionResult> {
  await resolveCurrentTraderId(client);
  const dates = safe(() => normalizeHistoricalSessionDates(input.dates));
  const sessionType = safe(() => validateHistoricalSessionType(input.sessionType));
  const result = await new TradingSessionRepository(client).resolveHistoricalImport({
    ...input,
    dates,
    sessionType,
  });
  if (result.error || !result.rows)
    throw new CsvImportError(
      result.error?.message.includes("ambiguous")
        ? "Resolve every ambiguous historical Session before confirming."
        : "Historical Sessions could not be resolved.",
    );
  const mappings: Record<string, string> = {};
  const sessionTypesByDate: Record<string, string> = {};
  let existingMapped = 0;
  let created = 0;
  for (const row of result.rows) {
    mappings[row.trade_date] = row.session_id;
    sessionTypesByDate[row.trade_date] = row.session_type;
    if (row.resolution_status === "created") created += 1;
    else existingMapped += 1;
  }
  return {
    mappings,
    sessionTypesByDate,
    existingMapped,
    created,
    ambiguousOrRejected: 0,
    failed: 0,
    reasons: [],
  };
}
