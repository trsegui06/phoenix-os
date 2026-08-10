-- Phoenix OS Sprint 01: Supabase Auth ownership and owner-only RLS.
-- Source of truth remains database/migrations. This migration must run after 0001.

alter table public.traders
  add constraint traders_auth_user_id_fkey
  foreign key (auth_user_id)
  references auth.users(id)
  on delete restrict;

create function public.is_current_trader(target_trader_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.traders
    where id = target_trader_id
      and auth_user_id = auth.uid()
  );
$$;

revoke all on function public.is_current_trader(uuid) from public;
grant execute on function public.is_current_trader(uuid) to authenticated;

alter table public.traders enable row level security;
grant select, insert, update on table public.traders to authenticated;
revoke delete on table public.traders from anon, authenticated;

create policy traders_select_own on public.traders for select to authenticated using (auth.uid() = auth_user_id);
create policy traders_insert_own on public.traders for insert to authenticated with check (auth.uid() = auth_user_id);
create policy traders_update_own on public.traders for update to authenticated using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['prop_firms', 'trading_accounts', 'sessions', 'setups', 'trades', 'objectives', 'reviews']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update on table public.%I to authenticated', table_name);
    execute format('revoke delete on table public.%I from anon, authenticated', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_current_trader(trader_id))', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_current_trader(trader_id))', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_current_trader(trader_id)) with check (public.is_current_trader(trader_id))', table_name || '_update_own', table_name);
  end loop;
end;
$$;

alter table public.trade_errors enable row level security;
grant select, insert, update on table public.trade_errors to authenticated;
revoke delete on table public.trade_errors from anon, authenticated;

create policy trade_errors_select_own on public.trade_errors for select to authenticated using (exists (select 1 from public.trades where trades.id = trade_errors.trade_id and public.is_current_trader(trades.trader_id)));
create policy trade_errors_insert_own on public.trade_errors for insert to authenticated with check (exists (select 1 from public.trades where trades.id = trade_errors.trade_id and public.is_current_trader(trades.trader_id)));
create policy trade_errors_update_own on public.trade_errors for update to authenticated using (exists (select 1 from public.trades where trades.id = trade_errors.trade_id and public.is_current_trader(trades.trader_id))) with check (exists (select 1 from public.trades where trades.id = trade_errors.trade_id and public.is_current_trader(trades.trader_id)));

alter table public.review_trades enable row level security;
grant select, insert, update on table public.review_trades to authenticated;
revoke delete on table public.review_trades from anon, authenticated;

create policy review_trades_select_own on public.review_trades for select to authenticated using (public.is_current_trader(trader_id) and exists (select 1 from public.reviews where reviews.id = review_trades.review_id and reviews.trader_id = review_trades.trader_id) and exists (select 1 from public.trades where trades.id = review_trades.trade_id and trades.trader_id = review_trades.trader_id));
create policy review_trades_insert_own on public.review_trades for insert to authenticated with check (public.is_current_trader(trader_id) and exists (select 1 from public.reviews where reviews.id = review_trades.review_id and reviews.trader_id = review_trades.trader_id) and exists (select 1 from public.trades where trades.id = review_trades.trade_id and trades.trader_id = review_trades.trader_id));
create policy review_trades_update_own on public.review_trades for update to authenticated using (public.is_current_trader(trader_id)) with check (public.is_current_trader(trader_id) and exists (select 1 from public.reviews where reviews.id = review_trades.review_id and reviews.trader_id = review_trades.trader_id) and exists (select 1 from public.trades where trades.id = review_trades.trade_id and trades.trader_id = review_trades.trader_id));

alter table public.review_objectives enable row level security;
grant select, insert, update on table public.review_objectives to authenticated;
revoke delete on table public.review_objectives from anon, authenticated;

create policy review_objectives_select_own on public.review_objectives for select to authenticated using (public.is_current_trader(trader_id) and exists (select 1 from public.reviews where reviews.id = review_objectives.review_id and reviews.trader_id = review_objectives.trader_id) and exists (select 1 from public.objectives where objectives.id = review_objectives.objective_id and objectives.trader_id = review_objectives.trader_id));
create policy review_objectives_insert_own on public.review_objectives for insert to authenticated with check (public.is_current_trader(trader_id) and exists (select 1 from public.reviews where reviews.id = review_objectives.review_id and reviews.trader_id = review_objectives.trader_id) and exists (select 1 from public.objectives where objectives.id = review_objectives.objective_id and objectives.trader_id = review_objectives.trader_id));
create policy review_objectives_update_own on public.review_objectives for update to authenticated using (public.is_current_trader(trader_id)) with check (public.is_current_trader(trader_id) and exists (select 1 from public.reviews where reviews.id = review_objectives.review_id and reviews.trader_id = review_objectives.trader_id) and exists (select 1 from public.objectives where objectives.id = review_objectives.objective_id and objectives.trader_id = review_objectives.trader_id));
