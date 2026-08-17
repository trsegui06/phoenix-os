import type { TradingAccount } from "@/domain/trading/trading-account";
import type { TradingSession } from "@/domain/trading/trading-session";
import type { TradingSetup } from "@/domain/trading/trading-setup";
import {
  createAccountFormAction,
  createSessionFormAction,
  createSetupFormAction,
  updateAccountFormAction,
  updateSessionFormAction,
  updateSetupFormAction,
} from "@/app/actions/trading-settings";
import { formatAccountMoney } from "@/lib/trading-settings";

const input =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-phoenix-orange focus:outline-none";
const label = "text-sm text-slate-300";
const button =
  "rounded-lg bg-phoenix-orange px-4 py-2 text-sm font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-orange";
const secondary =
  "rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-500";

function TextField({
  name,
  children,
  value,
  type = "text",
  required = false,
}: {
  name: string;
  children: React.ReactNode;
  value?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className={label}>
      {children}
      <input className={input} name={name} type={type} defaultValue={value} required={required} />
    </label>
  );
}

export function AccountSettings({ accounts }: { accounts: TradingAccount[] }) {
  return (
    <section
      id="accounts"
      aria-labelledby="accounts-title"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="accounts-title" className="text-xl font-semibold text-white">
            Trading Accounts
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Define where Trades and currency-scoped results belong.
          </p>
        </div>
        <details>
          <summary className={button}>Add Account</summary>
          <form
            action={createAccountFormAction}
            className="mt-4 grid gap-4 rounded-xl border border-slate-800 p-4 sm:grid-cols-2"
          >
            <TextField name="accountName" required>
              Account Name
            </TextField>
            <TextField name="broker" required>
              Broker
            </TextField>
            <TextField name="accountType" required>
              Account Type
            </TextField>
            <TextField name="currency" required>
              Currency (3-letter code)
            </TextField>
            <TextField name="initialBalance" required>
              Initial Balance
            </TextField>
            <TextField name="status" required>
              Status
            </TextField>
            <button className={`${button} sm:col-span-2`}>Create Trading Account</button>
          </form>
        </details>
      </div>
      <div className="mt-5 grid gap-4">
        {accounts.length === 0 && (
          <p className="text-sm text-slate-400">No Trading Accounts yet.</p>
        )}
        {accounts.map((account) => (
          <article
            key={account.id}
            className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">{account.accountName}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {account.broker} · {account.accountType} · {account.currency} · {account.status}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Initial {formatAccountMoney(account.initialBalanceCents)} {account.currency}
                  {account.currentBalanceCents !== null
                    ? ` · Current ${formatAccountMoney(account.currentBalanceCents)} ${account.currency}`
                    : ""}
                </p>
              </div>
              <details>
                <summary className={secondary}>Edit Account</summary>
                <form
                  action={updateAccountFormAction}
                  className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2"
                >
                  <input type="hidden" name="id" value={account.id} />
                  <TextField name="accountName" value={account.accountName} required>
                    Account Name
                  </TextField>
                  <TextField name="broker" value={account.broker} required>
                    Broker
                  </TextField>
                  <TextField name="accountType" value={account.accountType} required>
                    Account Type
                  </TextField>
                  <TextField name="status" value={account.status} required>
                    Status
                  </TextField>
                  <TextField
                    name="currentBalance"
                    value={
                      account.currentBalanceCents === null
                        ? ""
                        : formatAccountMoney(account.currentBalanceCents)
                    }
                  >
                    Current Balance
                  </TextField>
                  <TextField
                    name="balanceUpdatedAt"
                    type="datetime-local"
                    value={account.balanceUpdatedAt?.slice(0, 16) ?? ""}
                  >
                    Balance Updated At
                  </TextField>
                  <p className="text-xs text-slate-500 sm:col-span-2">
                    Currency and initial balance are fixed after creation to preserve historical
                    meaning.
                  </p>
                  <button className={`${button} sm:col-span-2`}>Update Trading Account</button>
                </form>
              </details>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SessionSettings({ sessions }: { sessions: TradingSession[] }) {
  const form = (session?: TradingSession) => (
    <>
      <TextField name="sessionDate" type="date" value={session?.sessionDate} required>
        Session Date
      </TextField>
      <TextField name="sessionType" value={session?.sessionType} required>
        Session Type
      </TextField>
      <TextField name="marketBias" value={session?.marketBias ?? ""}>
        Market Bias (optional)
      </TextField>
      <TextField name="emotionalState" value={session?.emotionalState ?? ""}>
        Emotional State (optional)
      </TextField>
      <label className={`${label} sm:col-span-2`}>
        Notes (optional)
        <textarea className={input} name="notes" defaultValue={session?.notes ?? ""} />
      </label>
    </>
  );
  return (
    <section
      id="sessions"
      aria-labelledby="sessions-title"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="sessions-title" className="text-xl font-semibold text-white">
            Trading Sessions
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Capture the day and context in which execution occurs.
          </p>
        </div>
        <details>
          <summary className={button}>Add Session</summary>
          <form
            action={createSessionFormAction}
            className="mt-4 grid gap-4 rounded-xl border border-slate-800 p-4 sm:grid-cols-2"
          >
            {form()}
            <button className={`${button} sm:col-span-2`}>Create Session</button>
          </form>
        </details>
      </div>
      <div className="mt-5 grid gap-4">
        {sessions.length === 0 && (
          <p className="text-sm text-slate-400">No Trading Sessions yet.</p>
        )}
        {sessions.map((session) => (
          <article
            key={session.id}
            className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">
                  {session.sessionDate} · {session.sessionType}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {session.marketBias || "No market bias"}
                  {session.emotionalState ? ` · ${session.emotionalState}` : ""}
                </p>
              </div>
              <details>
                <summary className={secondary}>Edit Session</summary>
                <form action={updateSessionFormAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={session.id} />
                  {form(session)}
                  <p className="text-xs text-amber-300 sm:col-span-2">
                    Changing date or type can reclassify historical Trade statistics.
                  </p>
                  <button className={`${button} sm:col-span-2`}>Update Session</button>
                </form>
              </details>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SetupSettings({ setups }: { setups: TradingSetup[] }) {
  const form = (setup?: TradingSetup) => (
    <>
      <TextField name="name" value={setup?.name} required>
        Name
      </TextField>
      <TextField name="timeframe" value={setup?.timeframe} required>
        Timeframe
      </TextField>
      <TextField name="marketCondition" value={setup?.marketCondition ?? ""}>
        Market Condition (optional)
      </TextField>
      <label className={`${label} sm:col-span-2`}>
        Entry Rules
        <textarea className={input} name="entryRules" defaultValue={setup?.entryRules} required />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Exit Rules
        <textarea className={input} name="exitRules" defaultValue={setup?.exitRules} required />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Validation Rules
        <textarea
          className={input}
          name="validationRules"
          defaultValue={setup?.validationRules}
          required
        />
      </label>
    </>
  );
  return (
    <section
      id="setups"
      aria-labelledby="setups-title"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="setups-title" className="text-xl font-semibold text-white">
            Trading Setups
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Define repeatable execution rules without scoring or automation.
          </p>
        </div>
        <details>
          <summary className={button}>Add Setup</summary>
          <form
            action={createSetupFormAction}
            className="mt-4 grid gap-4 rounded-xl border border-slate-800 p-4 sm:grid-cols-2"
          >
            {form()}
            <button className={`${button} sm:col-span-2`}>Create Setup</button>
          </form>
        </details>
      </div>
      <div className="mt-5 grid gap-4">
        {setups.length === 0 && <p className="text-sm text-slate-400">No Trading Setups yet.</p>}
        {setups.map((setup) => (
          <article
            key={setup.id}
            className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">
                  {setup.name} · {setup.timeframe}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {setup.marketCondition || "No market condition"}
                </p>
              </div>
              <details>
                <summary className={secondary}>Edit Setup</summary>
                <form action={updateSetupFormAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={setup.id} />
                  {form(setup)}
                  <p className="text-xs text-amber-300 sm:col-span-2">
                    Edits change the current description shown for historically linked Trades.
                  </p>
                  <button className={`${button} sm:col-span-2`}>Update Setup</button>
                </form>
              </details>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
