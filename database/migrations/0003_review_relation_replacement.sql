-- Permit authenticated owners to replace Review junction sets without allowing Review deletion.
grant delete on table public.review_trades, public.review_objectives to authenticated;

create policy review_trades_delete_own on public.review_trades
for delete to authenticated
using (
  public.is_current_trader(trader_id)
  and exists (select 1 from public.reviews where reviews.id = review_trades.review_id and reviews.trader_id = review_trades.trader_id)
  and exists (select 1 from public.trades where trades.id = review_trades.trade_id and trades.trader_id = review_trades.trader_id)
);

create policy review_objectives_delete_own on public.review_objectives
for delete to authenticated
using (
  public.is_current_trader(trader_id)
  and exists (select 1 from public.reviews where reviews.id = review_objectives.review_id and reviews.trader_id = review_objectives.trader_id)
  and exists (select 1 from public.objectives where objectives.id = review_objectives.objective_id and objectives.trader_id = review_objectives.trader_id)
);
