import { createHash } from "node:crypto";

import { CsvImportError } from "../csv-parser";
import type { NormalizedTradeImportCandidate, TradeImportSourceAdapter } from "../source-adapter";

export const raiseGlobalHeaders = [
  "Broker",
  "Compte ID",
  "Ticket",
  "Heure d'ouverture",
  "Heure de fermeture",
  "Prix de fermeture",
  "Symbole",
  "Type",
  "Lots",
  "Prix d'entrée",
  "Stop Loss",
  "Take Profit",
  "Commentaire",
  "Profit net",
] as const;

function decimal(value: string, field: string, allowNegative = false) {
  const normalized = value.trim().replace(/ €$/, "").replace(",", ".");
  if (!(allowNegative ? /^-?\d+(?:\.\d+)?$/ : /^\d+(?:\.\d+)?$/).test(normalized))
    throw new CsvImportError(`${field} contains an invalid decimal.`);
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new CsvImportError(`${field} is outside the safe range.`);
  return { normalized, number };
}

function iso(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value))
    throw new CsvImportError(`${field} must be an ISO 8601 UTC timestamp.`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new CsvImportError(`${field} is invalid.`);
  return parsed;
}

function cents(value: string) {
  const normalized = value.trim().replace(/ €$/, "").replace(",", ".");
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized))
    throw new CsvImportError("Profit net must contain an exact euro amount.");
  const negative = normalized.startsWith("-");
  const [whole, fraction = ""] = (negative ? normalized.slice(1) : normalized).split(".");
  const result = Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
  if (!Number.isSafeInteger(result))
    throw new CsvImportError("Profit net is outside the safe range.");
  return negative ? -result : result;
}

export const raiseGlobalAdapter: TradeImportSourceAdapter = {
  id: "raiseglobal-csv-v1",
  headers: raiseGlobalHeaders,
  parse(rows) {
    const parsed = rows.map((row, index) => {
      for (const header of raiseGlobalHeaders)
        if (!row[header]?.trim())
          throw new CsvImportError(`Row ${index + 2}: ${header} is required.`);
      if (row.Broker !== "RaiseGlobal-Live")
        throw new CsvImportError(`Row ${index + 2}: unsupported RaiseGlobal broker.`);
      const opened = iso(row["Heure d'ouverture"]!, `Row ${index + 2} opening time`);
      const closed = iso(row["Heure de fermeture"]!, `Row ${index + 2} closing time`);
      if (closed < opened)
        throw new CsvImportError(`Row ${index + 2}: closing time precedes opening time.`);
      const side: "long" | "short" | null =
        row.Type === "Buy" ? "long" : row.Type === "Sell" ? "short" : null;
      if (!side) throw new CsvImportError(`Row ${index + 2}: Type must be Buy or Sell.`);
      const tp = row.Commentaire!.match(/\bTP([123])\b/)?.[1];
      if (!tp) throw new CsvImportError(`Row ${index + 2}: Aurum TP leg is missing.`);
      const entry = decimal(row["Prix d'entrée"]!, `Row ${index + 2} entry price`);
      const stop = decimal(row["Stop Loss"]!, `Row ${index + 2} stop loss`);
      const target = decimal(row["Take Profit"]!, `Row ${index + 2} take profit`);
      const exit = decimal(row["Prix de fermeture"]!, `Row ${index + 2} exit price`);
      const lots = decimal(row.Lots!, `Row ${index + 2} lots`);
      if (
        entry.number <= 0 ||
        lots.number <= 0 ||
        stop.number < 0 ||
        target.number < 0 ||
        exit.number < 0
      )
        throw new CsvImportError(`Row ${index + 2}: prices and size violate Phoenix constraints.`);
      const pnlCents = cents(row["Profit net"]!);
      return {
        rowNumber: index + 2,
        row,
        opened,
        closed,
        side,
        tp: `TP${tp}` as "TP1" | "TP2" | "TP3",
        entry,
        stop,
        target,
        exit,
        lots,
        pnlCents,
      };
    });

    const ordered = [...parsed].sort((a, b) => a.opened.valueOf() - b.opened.valueOf());
    const groups: (typeof ordered)[] = [];
    for (const candidate of ordered) {
      const current = groups.at(-1);
      const previous = current?.at(-1);
      if (
        !previous ||
        candidate.row.Symbole !== previous.row.Symbole ||
        candidate.side !== previous.side ||
        candidate.opened.valueOf() - previous.opened.valueOf() > 3_000
      )
        groups.push([candidate]);
      else current!.push(candidate);
    }
    const groupByTicket = new Map<string, { reference: string; size: number }>();
    for (const group of groups) {
      const identity = group
        .map((item) => item.row.Ticket)
        .sort()
        .join(":");
      const reference = `aurum-${createHash("sha256").update(identity).digest("hex").slice(0, 12)}`;
      for (const item of group)
        groupByTicket.set(item.row.Ticket!, { reference, size: group.length });
    }

    return parsed.map((item): NormalizedTradeImportCandidate => {
      const group = groupByTicket.get(item.row.Ticket!)!;
      const warnings: string[] = [];
      if (group.size !== 3)
        warnings.push(`Signal group contains ${group.size} TP legs instead of 3.`);
      if (item.side === "long" && item.stop.number > item.entry.number)
        warnings.push("Exported Buy stop loss is above entry; the moved stop will be preserved.");
      if (item.side === "short" && item.stop.number < item.entry.number)
        warnings.push("Exported Sell stop loss is below entry; the moved stop will be preserved.");
      return {
        rowNumber: item.rowNumber,
        source: raiseGlobalAdapter.id,
        sourceBroker: item.row.Broker!,
        externalAccountId: item.row["Compte ID"]!,
        externalTradeId: item.row.Ticket!,
        openedAt: item.row["Heure d'ouverture"]!,
        closedAt: item.row["Heure de fermeture"]!,
        tradeDate: item.row["Heure d'ouverture"]!.slice(0, 10),
        sourceSymbol: item.row.Symbole!,
        direction: item.side,
        positionSize: item.lots.normalized,
        entryPrice: item.entry.normalized,
        stopLoss: item.stop.normalized,
        takeProfit: item.target.normalized,
        exitPrice: item.exit.normalized,
        pnlCents: item.pnlCents,
        result: item.pnlCents > 0 ? "win" : item.pnlCents < 0 ? "loss" : "breakeven",
        sourceComment: item.row.Commentaire!,
        tpLeg: item.tp,
        signalGroup: group.reference,
        warnings,
      };
    });
  },
};
