import { describe, expect, it } from "vitest";

import {
  DEFAULT_HISTORICAL_SESSION_TYPE,
  buildHistoricalSessionPlan,
  normalizeHistoricalSessionDates,
  validateHistoricalSessionType,
  type HistoricalSessionCandidate,
} from "@/domain/trading/historical-session";

const session = (
  id: string,
  sessionDate: string,
  sessionType = "regular",
): HistoricalSessionCandidate => ({ id, sessionDate, sessionType, creationSource: "manual" });

describe("Historical Session planning", () => {
  it("requires distinct, valid, bounded dates and sorts them", () => {
    expect(normalizeHistoricalSessionDates(["2026-08-18", "2026-08-17"])).toEqual([
      "2026-08-17",
      "2026-08-18",
    ]);
    expect(() => normalizeHistoricalSessionDates([])).toThrow(/1–500/);
    expect(() => normalizeHistoricalSessionDates(["2026-08-17", "2026-08-17"])).toThrow(/distinct/);
    expect(() => normalizeHistoricalSessionDates(["2026-02-30"])).toThrow(/YYYY-MM-DD/);
    expect(() =>
      normalizeHistoricalSessionDates(Array.from({ length: 501 }, (_, i) => date(i))),
    ).toThrow(/1–500/);
  });

  it("uses a visible default and validates an edited Session type", () => {
    expect(DEFAULT_HISTORICAL_SESSION_TYPE).toBe("Historical import");
    expect(validateHistoricalSessionType("  Imported archive  ")).toBe("Imported archive");
    expect(() => validateHistoricalSessionType("  ")).toThrow(/required/);
  });

  it("plans missing, singleton and ambiguous dates with accurate counts", () => {
    const plan = buildHistoricalSessionPlan(
      ["2026-08-17", "2026-08-18", "2026-08-19"],
      [
        session("one", "2026-08-18", "London"),
        session("two", "2026-08-19", "London"),
        session("three", "2026-08-19", "New York"),
      ],
    );
    expect(plan).toMatchObject({ datesDetected: 3, existing: 1, toCreate: 1, ambiguous: 1 });
    expect(plan.resolutions.map((item) => item.state)).toEqual([
      "to-create",
      "existing",
      "ambiguous",
    ]);
  });

  it("accepts a compatible ambiguity selection and rejects a wrong-date selection", () => {
    const sessions = [
      session("london", "2026-08-17", "London"),
      session("new-york", "2026-08-17", "New York"),
      session("other-date", "2026-08-18"),
    ];
    expect(
      buildHistoricalSessionPlan(["2026-08-17"], sessions, "Historical import", {
        "2026-08-17": "london",
      }),
    ).toMatchObject({ existing: 1, ambiguous: 0 });
    expect(() =>
      buildHistoricalSessionPlan(["2026-08-17"], sessions, "Historical import", {
        "2026-08-17": "other-date",
      }),
    ).toThrow(/compatible/);
  });

  it("reuses one historical Session across retry, Account and Setup contexts", () => {
    const historical: HistoricalSessionCandidate = {
      id: "historical",
      sessionDate: "2026-08-17",
      sessionType: "Historical import",
      creationSource: "historical_import",
    };
    const first = buildHistoricalSessionPlan(["2026-08-17"], []);
    const retry = buildHistoricalSessionPlan(["2026-08-17"], [historical]);
    expect(first).toMatchObject({ toCreate: 1, existing: 0 });
    expect(retry).toMatchObject({ toCreate: 0, existing: 1 });
    expect(retry.resolutions[0]).toMatchObject({ state: "existing", session: historical });
  });

  it("plans the current maximum of 500 dates in one bounded collection", () => {
    const dates = Array.from({ length: 500 }, (_, i) => date(i));
    expect(buildHistoricalSessionPlan(dates, [])).toMatchObject({
      datesDetected: 500,
      existing: 0,
      toCreate: 500,
      ambiguous: 0,
    });
  });
});

function date(offset: number) {
  const value = new Date(Date.UTC(2025, 0, 1 + offset));
  return value.toISOString().slice(0, 10);
}
