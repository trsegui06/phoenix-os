"use client";

import { useActionState, useState } from "react";
import { createTradeEntryAction, type TradeEntryState } from "@/app/actions/trading-entry";

type Option = { id: string; label: string; currency?: string };
type Props = { accounts: Option[]; sessions: Option[]; setups: Option[] };
type EntryError = { category: string; severity: string; description: string; solution: string };
const initialState: TradeEntryState = {};
const fieldClass =
  "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-phoenix-orange focus:outline-none";

export function TradeEntryForm({ accounts, sessions, setups }: Props) {
  const [state, action, pending] = useActionState(createTradeEntryAction, initialState);
  const [errors, setErrors] = useState<EntryError[]>([]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const currency = accounts.find((account) => account.id === accountId)?.currency;
  const updateError = (index: number, field: keyof EntryError, value: string) =>
    setErrors((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  const errorFor = (name: string) =>
    state.fieldErrors?.[name] ? (
      <p className="mt-1 text-sm text-red-300">{state.fieldErrors[name]}</p>
    ) : null;

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="errors" value={JSON.stringify(errors)} />
      {state.message && (
        <p
          role="alert"
          className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200"
        >
          {state.message}
        </p>
      )}
      <fieldset className="grid gap-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 md:grid-cols-2">
        <legend className="px-2 text-lg font-semibold text-white">Context</legend>
        <label className="text-sm text-slate-300">
          Trading Account
          <select
            name="tradingAccountId"
            required
            className={fieldClass}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {errorFor("tradingAccountId")}
        </label>
        <label className="text-sm text-slate-300">
          Session
          <select name="sessionId" required className={fieldClass} defaultValue={sessions[0]?.id}>
            {sessions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {errorFor("sessionId")}
        </label>
        <label className="text-sm text-slate-300">
          Setup
          <select name="setupId" required className={fieldClass} defaultValue={setups[0]?.id}>
            {setups.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {errorFor("setupId")}
        </label>
        <label className="text-sm text-slate-300">
          Trade Date
          <input name="tradeDate" type="date" required className={fieldClass} />
          {errorFor("tradeDate")}
        </label>
        <label className="text-sm text-slate-300">
          Asset
          <input name="asset" required className={fieldClass} placeholder="EURUSD" />
          {errorFor("asset")}
        </label>
        <label className="text-sm text-slate-300">
          Direction
          <select name="direction" className={fieldClass}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </label>
      </fieldset>
      <fieldset className="grid gap-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 md:grid-cols-2 lg:grid-cols-3">
        <legend className="px-2 text-lg font-semibold text-white">Execution</legend>
        {[
          ["entryPrice", "Entry Price"],
          ["stopLoss", "Stop Loss"],
          ["takeProfit", "Take Profit"],
          ["exitPrice", "Exit Price (optional)"],
          ["positionSize", "Position Size"],
          ["riskPercent", "Risk (%)"],
        ].map(([name, label]) => (
          <label key={name} className="text-sm text-slate-300">
            {label}
            <input
              name={name}
              inputMode="decimal"
              required={name !== "exitPrice"}
              className={fieldClass}
            />
            {errorFor(name)}
          </label>
        ))}
      </fieldset>
      <fieldset className="grid gap-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 md:grid-cols-2">
        <legend className="px-2 text-lg font-semibold text-white">Outcome</legend>
        <label className="text-sm text-slate-300">
          Result
          <input
            name="result"
            required
            className={fieldClass}
            placeholder="win, loss, breakeven, open"
          />
          {errorFor("result")}
        </label>
        <label className="text-sm text-slate-300">
          Realized P&amp;L{currency ? ` (${currency})` : ""}
          <input name="pnl" inputMode="decimal" className={fieldClass} />
          {errorFor("pnl")}
        </label>
        <label className="text-sm text-slate-300 md:col-span-2">
          Execution Quality
          <input name="executionQuality" className={fieldClass} placeholder="Optional" />
        </label>
      </fieldset>
      <fieldset className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <legend className="px-2 text-lg font-semibold text-white">Reflection</legend>
        <label className="block text-sm text-slate-300">
          Notes
          <textarea name="notes" rows={4} className={fieldClass} />
        </label>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Trade Errors</h2>
          <button
            type="button"
            onClick={() =>
              setErrors((rows) => [
                ...rows,
                { category: "", severity: "", description: "", solution: "" },
              ])
            }
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-white"
          >
            Add Error
          </button>
        </div>
        {errors.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-xl border border-slate-800 p-4 md:grid-cols-2"
          >
            <label className="text-sm text-slate-300">
              Category
              <input
                required
                className={fieldClass}
                value={row.category}
                onChange={(e) => updateError(index, "category", e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300">
              Severity
              <input
                required
                className={fieldClass}
                value={row.severity}
                onChange={(e) => updateError(index, "severity", e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300 md:col-span-2">
              Description
              <textarea
                required
                className={fieldClass}
                value={row.description}
                onChange={(e) => updateError(index, "description", e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-300 md:col-span-2">
              Solution
              <textarea
                className={fieldClass}
                value={row.solution}
                onChange={(e) => updateError(index, "solution", e.target.value)}
              />
            </label>
            <button
              type="button"
              aria-label={`Remove Trade Error ${index + 1}`}
              onClick={() => setErrors((rows) => rows.filter((_, i) => i !== index))}
              className="justify-self-start text-sm text-red-300"
            >
              Remove Error
            </button>
          </div>
        ))}
        {errorFor("errors")}
      </fieldset>
      <div className="flex justify-end">
        <button
          disabled={pending}
          className="rounded-lg bg-phoenix-orange px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
        >
          {pending ? "Recording…" : "Record Trade"}
        </button>
      </div>
    </form>
  );
}
