-- Permit an authenticated Trader to delete only their own Trading Account.
-- The trades FK remains ON DELETE RESTRICT as the final race-condition defense.
grant delete on table public.trading_accounts to authenticated;

create policy trading_accounts_delete_unused_own
on public.trading_accounts
for delete
to authenticated
using (
  public.is_current_trader(trader_id)
  and not exists (
    select 1
    from public.trades
    where trades.trading_account_id = trading_accounts.id
      and trades.trader_id = trading_accounts.trader_id
  )
);
