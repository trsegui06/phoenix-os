import type { TradingSession } from "./trading-session";

export const DEFAULT_HISTORICAL_SESSION_TYPE = "Historical import";
export const MAX_HISTORICAL_SESSION_DATES = 500;

export type HistoricalSessionCandidate = Pick<
  TradingSession,
  "id" | "sessionDate" | "sessionType" | "creationSource"
>;

export type HistoricalSessionResolution =
  | { state: "existing"; date: string; session: HistoricalSessionCandidate }
  | {
      state: "ambiguous";
      date: string;
      candidates: HistoricalSessionCandidate[];
      selectedSessionId?: string;
    }
  | { state: "to-create"; date: string; proposedSessionType: string };

export type HistoricalSessionPlan = {
  datesDetected: number;
  existing: number;
  toCreate: number;
  ambiguous: number;
  resolutions: HistoricalSessionResolution[];
};

export type HistoricalSessionResult = {
  mappings: Record<string, string>;
  sessionTypesByDate: Record<string, string>;
  existingMapped: number;
  created: number;
  ambiguousOrRejected: number;
  failed: number;
  reasons: string[];
};

const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export function normalizeHistoricalSessionDates(values: string[]) {
  if (!values.length || values.length > MAX_HISTORICAL_SESSION_DATES)
    throw new Error(
      `Historical Session dates must contain 1–${MAX_HISTORICAL_SESSION_DATES} values.`,
    );
  if (values.some((value) => !validDate(value)))
    throw new Error("Historical Session dates must use valid YYYY-MM-DD values.");
  if (new Set(values).size !== values.length)
    throw new Error("Historical Session dates must be distinct.");
  return [...values].sort();
}

export function validateHistoricalSessionType(value: string) {
  const type = value.trim();
  if (!type) throw new Error("Historical Session type is required.");
  return type;
}

export function buildHistoricalSessionPlan(
  dates: string[],
  sessions: HistoricalSessionCandidate[],
  proposedSessionType = DEFAULT_HISTORICAL_SESSION_TYPE,
  selectedSessionIdsByDate: Record<string, string> = {},
): HistoricalSessionPlan {
  const normalized = normalizeHistoricalSessionDates(dates);
  const type = validateHistoricalSessionType(proposedSessionType);
  const resolutions = normalized.map((date): HistoricalSessionResolution => {
    const candidates = sessions.filter((session) => session.sessionDate === date);
    if (!candidates.length) return { state: "to-create", date, proposedSessionType: type };
    if (candidates.length === 1) return { state: "existing", date, session: candidates[0]! };
    const selected = selectedSessionIdsByDate[date];
    if (selected && !candidates.some((candidate) => candidate.id === selected))
      throw new Error(`Selected Session for ${date} is not a compatible candidate.`);
    return {
      state: "ambiguous",
      date,
      candidates,
      ...(selected ? { selectedSessionId: selected } : {}),
    };
  });
  return {
    datesDetected: normalized.length,
    existing: resolutions.filter(
      (item) => item.state === "existing" || (item.state === "ambiguous" && item.selectedSessionId),
    ).length,
    toCreate: resolutions.filter((item) => item.state === "to-create").length,
    ambiguous: resolutions.filter((item) => item.state === "ambiguous" && !item.selectedSessionId)
      .length,
    resolutions,
  };
}
