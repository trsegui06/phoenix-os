"use client";

import { useState, useTransition } from "react";

import {
  analyzeTradeImportAction,
  executeTradeImportAction,
  previewTradeImportAction,
} from "@/app/actions/trading-import";
import type { TradeImportAnalysis, TradeImportPreviewRow } from "@/services/trading/trade-import";

type Option = { id: string; label: string };
type SessionOption = Option & { date: string };
type Props = { accounts: Option[]; sessions: SessionOption[]; setups: Option[] };
type Summary = {
  imported: number;
  duplicates: number;
  rejected: number;
  failed: number;
  reasons: string[];
};

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white";

export function TradeImportWorkflow({ accounts, sessions, setups }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<TradeImportAnalysis | null>(null);
  const [rows, setRows] = useState<TradeImportPreviewRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [accountId, setAccountId] = useState("");
  const [setupId, setSetupId] = useState("");
  const [sessionMap, setSessionMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const accountLabel = accounts.find((item) => item.id === accountId)?.label ?? accountId;
  const setupLabel = setups.find((item) => item.id === setupId)?.label ?? setupId;
  const sessionLabel = (id: string) => sessions.find((item) => item.id === id)?.label ?? id;

  const data = () => {
    const form = new FormData();
    if (file) form.set("file", file);
    if (analysis) form.set("fileHash", analysis.fileHash);
    form.set("tradingAccountId", accountId);
    form.set("setupId", setupId);
    form.set("asset", "XAUUSD");
    form.set("sessionIdsByDate", JSON.stringify(sessionMap));
    return form;
  };

  const analyze = () =>
    startTransition(async () => {
      setError(null);
      setRows(null);
      setSummary(null);
      const result = await analyzeTradeImportAction(data());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAnalysis(result.analysis);
      setSessionMap(Object.fromEntries(result.analysis.tradeDates.map((date) => [date, ""])));
    });

  const preview = () =>
    startTransition(async () => {
      setError(null);
      setSummary(null);
      const result = await previewTradeImportAction(data());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows(result.rows);
    });

  const execute = () =>
    startTransition(async () => {
      if (
        !window.confirm(
          `Import ${rows?.filter((row) => !row.duplicate).length ?? 0} historical Trades?`,
        )
      )
        return;
      setError(null);
      const result = await executeTradeImportAction(data());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result.summary);
      setRows(null);
    });

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-xl font-semibold text-white">1. Analyze source CSV</h2>
        <p className="mt-2 text-sm text-slate-400">
          UTF-8 CSV only · maximum 512 KiB and 500 rows · files are not stored.
        </p>
        <input
          aria-label="Historical Trade CSV"
          type="file"
          accept=".csv,text/csv"
          className={inputClass}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setAnalysis(null);
            setRows(null);
          }}
        />
        <button
          type="button"
          disabled={!file || pending}
          onClick={analyze}
          className="mt-4 rounded-lg bg-phoenix-orange px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
        >
          {pending ? "Working…" : "Analyze CSV"}
        </button>
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-200">
          {error}
        </p>
      )}

      {analysis && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xl font-semibold text-white">2. Map Phoenix context</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <p>
              <strong className="block text-2xl text-white">{analysis.rowCount}</strong>Rows
            </p>
            <p>
              <strong className="block text-2xl text-white">{analysis.uniqueTicketCount}</strong>
              Tickets
            </p>
            <p>
              <strong className="block text-2xl text-white">{analysis.signalGroupCount}</strong>
              Signals
            </p>
            <p>
              <strong className="block text-2xl text-white">{analysis.warningCount}</strong>Warnings
            </p>
          </div>
          <p className="mt-4 text-sm text-slate-300">
            {analysis.winCount} wins · {analysis.lossCount} losses · {analysis.breakevenCount}{" "}
            breakeven
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              Phoenix Trading Account
              <select
                required
                className={inputClass}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">Select owned Account</option>
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              AURUM VIP Setup
              <select
                required
                className={inputClass}
                value={setupId}
                onChange={(e) => setSetupId(e.target.value)}
              >
                <option value="">Select owned Setup</option>
                {setups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Asset mapping
              <input
                readOnly
                className={inputClass}
                value={`${analysis.sourceSymbols.join(", ")} → XAUUSD`}
              />
            </label>
            <label className="text-sm text-slate-300">
              Historical risk
              <input
                readOnly
                className={inputClass}
                value="UNKNOWN — excluded from risk averages"
              />
            </label>
            {analysis.tradeDates.map((date) => (
              <label key={date} className="text-sm text-slate-300">
                Session for {date}
                <select
                  required
                  className={inputClass}
                  value={sessionMap[date] ?? ""}
                  onChange={(e) =>
                    setSessionMap((current) => ({ ...current, [date]: e.target.value }))
                  }
                >
                  <option value="">Select owned Session</option>
                  {sessions
                    .filter((item) => item.date === date)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                </select>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={preview}
            className="mt-5 rounded-lg bg-phoenix-orange px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
          >
            Preview import
          </button>
        </section>
      )}

      {rows && (
        <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xl font-semibold text-white">3. Confirm preview</h2>
          <p className="mt-2 text-sm text-slate-300">
            Valid: {rows.filter((row) => !row.duplicate).length} · Duplicates:{" "}
            {rows.filter((row) => row.duplicate).length} · Invalid: 0
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[1200px] text-left text-xs">
              <thead>
                <tr className="text-slate-400">
                  {[
                    "Ticket",
                    "Opened",
                    "Closed",
                    "Asset",
                    "Side",
                    "Lots",
                    "Entry",
                    "SL",
                    "TP",
                    "Exit",
                    "P&L",
                    "Result",
                    "Leg",
                    "Signal",
                    "Account",
                    "Session",
                    "Setup",
                    "Risk",
                    "Status",
                  ].map((label) => (
                    <th key={label} className="px-2 py-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row) => (
                  <tr key={row.externalTradeId}>
                    <td className="px-2 py-2">{row.externalTradeId}</td>
                    <td className="px-2">{row.openedAt}</td>
                    <td className="px-2">{row.closedAt}</td>
                    <td className="px-2">{row.mappedAsset}</td>
                    <td className="px-2">{row.direction}</td>
                    <td className="px-2">{row.positionSize}</td>
                    <td className="px-2">{row.entryPrice}</td>
                    <td className="px-2">{row.stopLoss}</td>
                    <td className="px-2">{row.takeProfit}</td>
                    <td className="px-2">{row.exitPrice}</td>
                    <td className="px-2">{(row.pnlCents / 100).toFixed(2)} EUR</td>
                    <td className="px-2">{row.result}</td>
                    <td className="px-2">{row.tpLeg}</td>
                    <td className="px-2">{row.signalGroup}</td>
                    <td className="px-2">{accountLabel}</td>
                    <td className="px-2">{sessionLabel(row.sessionId)}</td>
                    <td className="px-2">{setupLabel}</td>
                    <td className="px-2">Unknown</td>
                    <td className="px-2">
                      {row.duplicate
                        ? "Duplicate"
                        : row.warnings.length
                          ? row.warnings.join(" ")
                          : "Ready"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            disabled={pending || rows.every((row) => row.duplicate)}
            onClick={execute}
            className="mt-5 rounded-lg bg-phoenix-orange px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
          >
            Confirm import
          </button>
        </section>
      )}

      {summary && (
        <section
          role="status"
          className="rounded-2xl border border-emerald-900 bg-emerald-950/30 p-5 text-emerald-100"
        >
          <h2 className="text-xl font-semibold">Import complete</h2>
          <p className="mt-3">
            Imported: {summary.imported} · Duplicates: {summary.duplicates} · Rejected:{" "}
            {summary.rejected} · Failed: {summary.failed}
          </p>
          {summary.reasons.map((reason) => (
            <p key={reason} className="mt-2 text-sm">
              {reason}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
