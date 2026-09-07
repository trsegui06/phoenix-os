"use client";

import { useState, useTransition } from "react";

import {
  analyzeTradeImportAction,
  executeTradeImportAction,
  previewTradeImportAction,
} from "@/app/actions/trading-import";
import { DEFAULT_HISTORICAL_SESSION_TYPE } from "@/domain/trading/historical-session";
import type {
  TradeImportAnalysis,
  TradeImportExecutionSummary,
  TradeImportPreview,
} from "@/services/trading/trade-import";

type Option = { id: string; label: string };
type Props = { accounts: Option[]; setups: Option[] };

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white";
const primary =
  "rounded-lg bg-phoenix-orange px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50";

export function TradeImportWorkflow({ accounts, setups }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<TradeImportAnalysis | null>(null);
  const [previewResult, setPreviewResult] = useState<TradeImportPreview | null>(null);
  const [summary, setSummary] = useState<TradeImportExecutionSummary | null>(null);
  const [accountId, setAccountId] = useState("");
  const [setupId, setSetupId] = useState("");
  const [historicalSessionType, setHistoricalSessionType] = useState(
    DEFAULT_HISTORICAL_SESSION_TYPE,
  );
  const [selectedSessionIdsByDate, setSelectedSessionIdsByDate] = useState<Record<string, string>>(
    {},
  );
  const [previewStale, setPreviewStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const accountLabel = accounts.find((item) => item.id === accountId)?.label ?? accountId;
  const setupLabel = setups.find((item) => item.id === setupId)?.label ?? setupId;

  const markPreviewStale = () => {
    if (previewResult) setPreviewStale(true);
    setSummary(null);
  };

  const data = () => {
    const form = new FormData();
    if (file) form.set("file", file);
    if (analysis) form.set("fileHash", analysis.fileHash);
    form.set("tradingAccountId", accountId);
    form.set("setupId", setupId);
    form.set("asset", "XAUUSD");
    form.set("historicalSessionType", historicalSessionType);
    form.set("selectedSessionIdsByDate", JSON.stringify(selectedSessionIdsByDate));
    return form;
  };

  const analyze = () =>
    startTransition(async () => {
      setError(null);
      setPreviewResult(null);
      setSummary(null);
      const result = await analyzeTradeImportAction(data());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAnalysis(result.analysis);
      setHistoricalSessionType(DEFAULT_HISTORICAL_SESSION_TYPE);
      setSelectedSessionIdsByDate({});
      setPreviewStale(false);
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
      setPreviewResult(result.preview);
      setPreviewStale(false);
    });

  const execute = () =>
    startTransition(async () => {
      if (
        !window.confirm(
          `Create ${previewResult?.sessionPlan.toCreate ?? 0} historical Sessions and import ${
            previewResult?.rows.filter((row) => !row.duplicate).length ?? 0
          } historical Trades?`,
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
      setPreviewResult(null);
    });

  const unresolved = previewResult?.sessionPlan.ambiguous ?? 0;
  const readyRows = previewResult?.rows.filter((row) => !row.duplicate).length ?? 0;

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-xl font-semibold text-white">1. Upload CSV</h2>
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
            setPreviewResult(null);
            setSummary(null);
          }}
        />
        <button
          type="button"
          disabled={!file || pending}
          onClick={analyze}
          className={`mt-4 ${primary}`}
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
          <h2 className="text-xl font-semibold text-white">2. Map Account and Setup</h2>
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
                onChange={(event) => {
                  setAccountId(event.target.value);
                  markPreviewStale();
                }}
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
                onChange={(event) => {
                  setSetupId(event.target.value);
                  markPreviewStale();
                }}
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
            <label className="text-sm text-slate-300 md:col-span-2">
              Session type for missing dates
              <input
                required
                className={inputClass}
                value={historicalSessionType}
                onChange={(event) => {
                  setHistoricalSessionType(event.target.value);
                  markPreviewStale();
                }}
              />
              <span className="mt-2 block text-xs text-slate-500">
                Applied only to Sessions that Phoenix proposes creating. No market context is
                inferred.
              </span>
            </label>
          </div>
          <button
            type="button"
            disabled={pending || !accountId || !setupId || !historicalSessionType.trim()}
            onClick={preview}
            className={`mt-5 ${primary}`}
          >
            Preview import
          </button>
        </section>
      )}

      {previewResult && (
        <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xl font-semibold text-white">3. Resolve Sessions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <p>
              <strong className="block text-2xl text-white">
                {previewResult.sessionPlan.datesDetected}
              </strong>
              Dates detected
            </p>
            <p>
              <strong className="block text-2xl text-white">
                {previewResult.sessionPlan.existing}
              </strong>
              Existing Sessions
            </p>
            <p>
              <strong className="block text-2xl text-white">
                {previewResult.sessionPlan.toCreate}
              </strong>
              Sessions to create
            </p>
            <p>
              <strong className="block text-2xl text-white">
                {previewResult.sessionPlan.ambiguous}
              </strong>
              Ambiguous
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {previewResult.sessionPlan.resolutions
              .filter((item) => item.state === "ambiguous")
              .map((item) => (
                <label
                  key={item.date}
                  className="rounded-xl border border-amber-800 bg-amber-950/20 p-4 text-sm text-slate-200"
                >
                  Session for {item.date} · Action required
                  <select
                    className={inputClass}
                    value={selectedSessionIdsByDate[item.date] ?? ""}
                    onChange={(event) => {
                      setSelectedSessionIdsByDate((current) => ({
                        ...current,
                        [item.date]: event.target.value,
                      }));
                      setPreviewStale(true);
                    }}
                  >
                    <option value="">Select owned Session</option>
                    {item.candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.sessionDate} — {candidate.sessionType}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
          </div>

          <details className="mt-5 rounded-xl border border-slate-800 p-4">
            <summary className="cursor-pointer font-medium text-white">Review Session plan</summary>
            <div className="mt-3 grid gap-2 text-sm">
              {previewResult.sessionPlan.resolutions.map((item) => {
                if (item.state === "existing")
                  return (
                    <p key={item.date}>
                      {item.date} · {item.session.sessionType} · Existing
                    </p>
                  );
                if (item.state === "to-create")
                  return (
                    <p key={item.date}>
                      {item.date} · {item.proposedSessionType} · Will create
                    </p>
                  );
                if (item.state === "ambiguous")
                  return (
                    <p key={item.date}>
                      {item.date} ·{" "}
                      {item.selectedSessionId ? "Selection pending refresh" : "Action required"}
                    </p>
                  );
                return null;
              })}
            </div>
          </details>

          {previewStale && (
            <p role="status" className="mt-4 text-sm text-amber-300">
              Session choices changed. Refresh the preview before confirming.
            </p>
          )}

          <h2 className="mt-8 text-xl font-semibold text-white">4. Confirm preview</h2>
          <p className="mt-2 text-sm text-slate-300">
            Valid: {readyRows} · Duplicates:{" "}
            {previewResult.rows.filter((row) => row.duplicate).length} · Invalid: 0
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
                {previewResult.rows.map((row) => (
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
                    <td className="px-2">
                      {row.sessionType} · {row.sessionStatus}
                    </td>
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
            disabled={pending || previewStale || unresolved > 0 || readyRows === 0}
            onClick={execute}
            className={`mt-5 ${primary}`}
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
          <h3 className="mt-4 font-semibold">Sessions</h3>
          <p className="mt-2">
            Existing mapped: {summary.sessions.existingMapped} · Created: {summary.sessions.created}{" "}
            · Ambiguous/rejected: {summary.sessions.ambiguousOrRejected} · Failed:{" "}
            {summary.sessions.failed}
          </p>
          <h3 className="mt-4 font-semibold">Trades</h3>
          <p className="mt-2">
            Imported: {summary.trades.imported} · Duplicates: {summary.trades.duplicates} ·
            Rejected: {summary.trades.rejected} · Failed: {summary.trades.failed}
          </p>
          {[...summary.sessions.reasons, ...summary.trades.reasons].map((reason) => (
            <p key={reason} className="mt-2 text-sm">
              {reason}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
