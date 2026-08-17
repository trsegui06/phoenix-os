-- Trading Statistics v1 Phase A: authenticated, tenant-bound Overview aggregation.
-- SECURITY DEFINER permits one aggregate boundary while ownership is derived only
-- from auth.uid(). Exact PostgreSQL aggregates cross the boundary as decimal text.

create function public.trading_statistics_overview(
  filter_from date default null,
  filter_to date default null,
  filter_trading_account_id uuid default null
)
returns table (
  total_trade_count text,
  closed_trade_count text,
  unresolved_trade_count text,
  win_count text,
  loss_count text,
  breakeven_count text,
  win_rate text,
  average_risk_basis_points text,
  realized_pnl_by_currency jsonb,
  trade_error_count text,
  trades_with_errors_count text,
  trade_error_rate text,
  review_count text,
  objective_count text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_trader_id uuid;
begin
  select traders.id into current_trader_id
  from public.traders
  where traders.auth_user_id = auth.uid();

  if current_trader_id is null then
    raise exception using errcode = 'P0001', message = 'Trading statistics request rejected';
  end if;

  if filter_from is not null and filter_to is not null and filter_to < filter_from then
    raise exception using errcode = 'P0001', message = 'Trading statistics request rejected';
  end if;

  if filter_trading_account_id is not null and not exists (
    select 1
    from public.trading_accounts
    where trading_accounts.id = filter_trading_account_id
      and trading_accounts.trader_id = current_trader_id
  ) then
    raise exception using errcode = 'P0001', message = 'Trading statistics request rejected';
  end if;

  return query
  with filtered_trades as materialized (
    select
      trades.id,
      trades.pnl_cents,
      trades.risk_basis_points,
      trading_accounts.currency
    from public.trades
    join public.trading_accounts
      on trading_accounts.id = trades.trading_account_id
     and trading_accounts.trader_id = trades.trader_id
    where trades.trader_id = current_trader_id
      and (filter_from is null or trades.trade_date >= filter_from)
      and (filter_to is null or trades.trade_date <= filter_to)
      and (filter_trading_account_id is null or trades.trading_account_id = filter_trading_account_id)
  ),
  trade_metrics as (
    select
      count(*) as total_count,
      count(*) filter (where pnl_cents is not null) as closed_count,
      count(*) filter (where pnl_cents is null) as unresolved_count,
      count(*) filter (where pnl_cents > 0) as wins,
      count(*) filter (where pnl_cents < 0) as losses,
      count(*) filter (where pnl_cents = 0) as breakevens,
      avg(risk_basis_points) as average_risk
    from filtered_trades
  ),
  currency_metrics as (
    select
      currency,
      sum(pnl_cents)::text as realized_pnl_cents,
      avg(pnl_cents)::text as average_pnl_cents,
      coalesce(sum(pnl_cents) filter (where pnl_cents > 0), 0)::text as gross_profit_cents,
      coalesce(sum(pnl_cents) filter (where pnl_cents < 0), 0)::text as gross_loss_cents
    from filtered_trades
    where pnl_cents is not null
    group by currency
  ),
  currency_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'currency', currency,
          'realizedPnlCents', realized_pnl_cents,
          'averagePnlCents', average_pnl_cents,
          'grossProfitCents', gross_profit_cents,
          'grossLossCents', gross_loss_cents
        ) order by currency
      ),
      '[]'::jsonb
    ) as value
    from currency_metrics
  ),
  error_metrics as (
    select
      count(trade_errors.id) as error_count,
      count(distinct trade_errors.trade_id) as trades_with_errors
    from filtered_trades
    left join public.trade_errors on trade_errors.trade_id = filtered_trades.id
  ),
  review_metrics as (
    select count(*) as count
    from public.reviews
    where reviews.trader_id = current_trader_id
      and (filter_to is null or reviews.period_start <= filter_to)
      and (filter_from is null or reviews.period_end >= filter_from)
  ),
  objective_metrics as (
    select count(*) as count
    from public.objectives
    where objectives.trader_id = current_trader_id
  )
  select
    trade_metrics.total_count::text,
    trade_metrics.closed_count::text,
    trade_metrics.unresolved_count::text,
    trade_metrics.wins::text,
    trade_metrics.losses::text,
    trade_metrics.breakevens::text,
    case
      when trade_metrics.wins + trade_metrics.losses = 0 then null
      else (trade_metrics.wins::numeric / (trade_metrics.wins + trade_metrics.losses))::text
    end,
    trade_metrics.average_risk::text,
    currency_json.value,
    error_metrics.error_count::text,
    error_metrics.trades_with_errors::text,
    case
      when trade_metrics.total_count = 0 then null
      else (error_metrics.trades_with_errors::numeric / trade_metrics.total_count)::text
    end,
    review_metrics.count::text,
    objective_metrics.count::text
  from trade_metrics, currency_json, error_metrics, review_metrics, objective_metrics;
end;
$$;

revoke all on function public.trading_statistics_overview(date, date, uuid) from public;
grant execute on function public.trading_statistics_overview(date, date, uuid) to authenticated;
