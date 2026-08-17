import type { TradingAccount } from "@/domain/trading/trading-account";
import type { TradingStatisticsFilter } from "@/domain/trading/trading-statistics";

export function TradingFilters({
  filter,
  accounts,
}: {
  filter: TradingStatisticsFilter;
  accounts: TradingAccount[];
}) {
  const control =
    "h-11 min-w-0 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-phoenix-orange focus:ring-2 focus:ring-orange-500/20";
  return (
    <form
      aria-label="Trading statistics filters"
      className="grid min-w-0 gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto_auto] lg:items-end"
    >
      <label className="grid gap-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        From
        <input className={control} type="date" name="from" defaultValue={filter.from} />
      </label>
      <label className="grid gap-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        To
        <input className={control} type="date" name="to" defaultValue={filter.to} />
      </label>
      <label className="grid gap-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        Trading account
        <select className={control} name="account" defaultValue={filter.tradingAccountId ?? ""}>
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.accountName} / {account.broker} / {account.currency}
            </option>
          ))}
        </select>
      </label>
      <button className="h-11 rounded-lg bg-phoenix-orange px-5 text-sm font-bold text-slate-950 transition hover:bg-orange-400 focus:ring-2 focus:ring-orange-300 focus:outline-none">
        Apply
      </button>
      <a
        className="flex h-11 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
        href="/trading"
      >
        Reset
      </a>
    </form>
  );
}
