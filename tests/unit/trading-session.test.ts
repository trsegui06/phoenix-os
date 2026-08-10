import { describe, expect, it } from "vitest";
import {
  TradingSessionValidationError,
  validateCreateTradingSession,
  validateUpdateTradingSession,
} from "@/domain/trading/trading-session";
import { TradingApplicationError } from "@/services/trading/errors";

const valid = {
  sessionDate: "2026-08-10",
  sessionType: " Regular ",
  marketBias: " Bullish ",
  emotionalState: " Calm ",
  notes: " Note ",
};

describe("Trading Session validation", () => {
  it("normalizes a valid session and keeps ownership outside its contract", () => {
    expect(validateCreateTradingSession(valid)).toEqual({
      sessionDate: "2026-08-10",
      sessionType: "Regular",
      marketBias: "Bullish",
      emotionalState: "Calm",
      notes: "Note",
    });
    expect(validateUpdateTradingSession({})).not.toHaveProperty("traderId");
  });

  it("rejects malformed, impossible, and timestamp dates", () => {
    for (const sessionDate of ["2026-2-10", "2026-02-30", "2026-08-10T00:00:00Z"]) {
      expect(() => validateCreateTradingSession({ ...valid, sessionDate })).toThrow(
        TradingSessionValidationError,
      );
    }
  });

  it("rejects an empty session type", () => {
    expect(() => validateCreateTradingSession({ ...valid, sessionType: " " })).toThrow(
      TradingSessionValidationError,
    );
  });

  it("normalizes optional fields", () => {
    expect(validateUpdateTradingSession({ marketBias: " ", notes: " x " })).toEqual({
      marketBias: null,
      notes: "x",
    });
  });

  it("uses the stable Session not-found error code", () => {
    expect(new TradingApplicationError("TRADING_SESSION_NOT_FOUND", "not found").code).toBe(
      "TRADING_SESSION_NOT_FOUND",
    );
  });
});
