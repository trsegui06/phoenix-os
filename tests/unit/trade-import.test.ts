import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { validateImportedTrade } from "@/domain/trading/trade-import";
import { TradeValidationError, validateCreateTrade } from "@/domain/trading/trade";
import { raiseGlobalHeaders } from "@/lib/trading-import/adapters/raiseglobal";
import { CsvImportError, MAX_IMPORT_BYTES, parseCsvBytes } from "@/lib/trading-import/csv-parser";
import { analyzeTradeImport } from "@/services/trading/trade-import";

const fixture = readFileSync(
  fileURLToPath(new URL("../fixtures/raiseglobal-sanitized.csv", import.meta.url)),
);

const csvLine = (values: string[]) =>
  values
    .map((value) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value))
    .join(",");

function makeAcceptanceCsv() {
  const rows: string[][] = [];
  let ticket = 10_000;
  const results = [...Array(14).fill("10,00 €"), ...Array(32).fill("-10,00 €"), "0,00 €"];
  for (let group = 0; group < 16; group += 1) {
    const size = group === 15 ? 2 : 3;
    for (let leg = 1; leg <= size; leg += 1) {
      const index = rows.length;
      const date = `2026-08-${String(17 + Math.floor(group / 4)).padStart(2, "0")}`;
      rows.push([
        "RaiseGlobal-Live",
        "SANITIZED-AURUM",
        String(ticket++),
        `${date}T${String(8 + group).padStart(2, "0")}:00:0${leg - 1}Z`,
        `${date}T${String(8 + group).padStart(2, "0")}:30:00Z`,
        "2401,00",
        "Gold",
        group % 2 ? "Sell" : "Buy",
        "0,01",
        "2400,00",
        index < 2 ? "2401,00" : group % 2 ? "2410,00" : "2390,00",
        group % 2 ? "2390,00" : "2410,00",
        `AURUM TP${leg}`,
        results[index]!,
      ]);
    }
  }
  return new TextEncoder().encode(
    [csvLine([...raiseGlobalHeaders]), ...rows.map(csvLine)].join("\n"),
  );
}

const validTrade = {
  tradingAccountId: randomUUID(),
  sessionId: randomUUID(),
  setupId: randomUUID(),
  tradeDate: "2026-08-17",
  asset: "XAUUSD",
  direction: "long" as const,
  entryPrice: 2400,
  stopLoss: 2390,
  takeProfit: 2410,
  positionSize: 0.01,
  result: "win",
  pnlCents: 1000,
};

describe("Historical Trade import", () => {
  it("parses the sanitized RaiseGlobal format and preserves moved stops and outcomes", () => {
    const result = analyzeTradeImport(fixture);
    expect(result).toMatchObject({
      rowCount: 5,
      uniqueTicketCount: 5,
      signalGroupCount: 2,
      winCount: 2,
      lossCount: 2,
      breakevenCount: 1,
    });
    expect(result.warningCount).toBe(4);
    expect(result.tradeDates).toEqual(["2026-08-17", "2026-08-18"]);
  });

  it("simulates the audited 47-position Aurum acceptance target", () => {
    const result = analyzeTradeImport(makeAcceptanceCsv());
    expect(result).toMatchObject({
      rowCount: 47,
      uniqueTicketCount: 47,
      signalGroupCount: 16,
      winCount: 14,
      lossCount: 32,
      breakevenCount: 1,
    });
    expect(result.tradeDates).toHaveLength(4);
    expect(result.warningCount).toBe(4);
  });

  it("keeps manual risk required while allowing unknown risk with complete provenance", () => {
    expect(() => validateCreateTrade({ ...validTrade, riskBasisPoints: null as never })).toThrow(
      TradeValidationError,
    );
    expect(validateCreateTrade({ ...validTrade, riskBasisPoints: 0 }).riskBasisPoints).toBe(0);
    expect(
      validateImportedTrade({
        ...validTrade,
        riskBasisPoints: null,
        provenance: {
          source: "raiseglobal-csv-v1",
          externalAccountId: "DEMO",
          externalTradeId: "1",
          batchId: randomUUID(),
          metadata: {},
        },
      }).riskBasisPoints,
    ).toBeNull();
    expect(() =>
      validateImportedTrade({
        ...validTrade,
        riskBasisPoints: null,
        provenance: {
          source: "",
          externalAccountId: "DEMO",
          externalTradeId: "1",
          batchId: randomUUID(),
          metadata: {},
        },
      }),
    ).toThrow("source is required");
  });

  it("rejects malformed, duplicate-header, duplicate-ticket, oversized, and over-row-limit input", () => {
    expect(() => parseCsvBytes(new TextEncoder().encode('A,B\n"x,y'))).toThrow(CsvImportError);
    expect(() => parseCsvBytes(new TextEncoder().encode("A,A\nx,y"))).toThrow("duplicate headers");
    expect(() => parseCsvBytes(new Uint8Array(MAX_IMPORT_BYTES + 1))).toThrow("512 KiB");
    const header = csvLine([...raiseGlobalHeaders]);
    const first = fixture.toString("utf8").trim().split("\n")[1]!.replace(/\r$/, "");
    expect(() =>
      analyzeTradeImport(new TextEncoder().encode(`${header}\n${first}\n${first}`)),
    ).toThrow("duplicate source Tickets");
    expect(() =>
      analyzeTradeImport(new TextEncoder().encode([header, ...Array(501).fill(first)].join("\n"))),
    ).toThrow("500-row");
  });
});
