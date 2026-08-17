-- Trading Statistics v1 Phase B: canonical performance and Trade Error breakdowns.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.trading_statistics_performance_breakdown(
  group_kind text,
  filter_from date,
  filter_to date,
  filter_trading_account_id uuid
)
returns table (
  group_id uuid,
  group_label text,
  total_trade_count text,
  closed_trade_count text,
  unresolved_trade_count text,
  win_count text,
  loss_count text,
  breakeven_count text,
  win_rate text,
  average_risk_basis_points text,
  realized_pnl_by_currency jsonb
)
language plpgsql
stable
set search_path = ''
as $$
declare
  current_trader_id uuid;
begin
  if group_kind not in ('setup', 'session_type', 'asset') then
    raise exception using errcode = 'P0001', message = 'Trading statistics request rejected';
  end if;

  select traders.id into current_trader_id
  from public.traders
  where traders.auth_user_id = auth.uid();

  if current_trader_id is null
    or (filter_from is not null and filter_to is not null and filter_to < filter_from)
    or (filter_trading_account_id is not null and not exists (
      select 1 from public.trading_accounts
      where trading_accounts.id = filter_trading_account_id
        and trading_accounts.trader_id = current_trader_id
    )) then
    raise exception using errcode = 'P0001', message = 'Trading statistics request rejected';
  end if;

  return query
  with filtered as materialized (
    select
      case when group_kind = 'setup' then trades.setup_id end as dimension_id,
      case group_kind
        when 'setup' then setups.name
        when 'session_type' then sessions.session_type
        when 'asset' then trades.asset
      end as dimension_label,
      trades.pnl_cents,
      trades.risk_basis_points,
      trading_accounts.currency
    from public.trades
    join public.trading_accounts
      on trading_accounts.id = trades.trading_account_id
     and trading_accounts.trader_id = trades.trader_id
    join public.setups
      on setups.id = trades.setup_id and setups.trader_id = trades.trader_id
    join public.sessions
      on sessions.id = trades.session_id and sessions.trader_id = trades.trader_id
    where trades.trader_id = current_trader_id
      and (filter_from is null or trades.trade_date >= filter_from)
      and (filter_to is null or trades.trade_date <= filter_to)
      and (filter_trading_account_id is null or trades.trading_account_id = filter_trading_account_id)
  ),
  metrics as (
    select
      dimension_id,
      dimension_label,
      count(*) as total_count,
      count(*) filter (where pnl_cents is not null) as closed_count,
      count(*) filter (where pnl_cents is null) as unresolved_count,
      count(*) filter (where pnl_cents > 0) as wins,
      count(*) filter (where pnl_cents < 0) as losses,
      count(*) filter (where pnl_cents = 0) as breakevens,
      avg(risk_basis_points) as average_risk
    from filtered
    group by dimension_id, dimension_label
  )
  select
    metrics.dimension_id,
    metrics.dimension_label,
    metrics.total_count::text,
    metrics.closed_count::text,
    metrics.unresolved_count::text,
    metrics.wins::text,
    metrics.losses::text,
    metrics.breakevens::text,
    case when metrics.wins + metrics.losses = 0 then null
      else (metrics.wins::numeric / (metrics.wins + metrics.losses))::text end,
    metrics.average_risk::text,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'currency', currency_totals.currency,
        'realizedPnlCents', currency_totals.realized,
        'averagePnlCents', currency_totals.average,
        'grossProfitCents', currency_totals.profit,
        'grossLossCents', currency_totals.loss
      ) order by currency_totals.currency)
      from (
        select
          filtered.currency,
          sum(filtered.pnl_cents)::text as realized,
          avg(filtered.pnl_cents)::text as average,
          coalesce(sum(filtered.pnl_cents) filter (where filtered.pnl_cents > 0), 0)::text as profit,
          coalesce(sum(filtered.pnl_cents) filter (where filtered.pnl_cents < 0), 0)::text as loss
        from filtered
        where filtered.dimension_id is not distinct from metrics.dimension_id
          and filtered.dimension_label = metrics.dimension_label
          and filtered.pnl_cents is not null
        group by filtered.currency
      ) currency_totals
    ), '[]'::jsonb)
  from metrics
  order by metrics.dimension_label, metrics.dimension_id;
end;
$$;

revoke all on function private.trading_statistics_performance_breakdown(text, date, date, uuid) from public, anon, authenticated;

create function public.trading_statistics_by_setup(
  filter_from date default null,
  filter_to date default null,
  filter_trading_account_id uuid default null
)
returns table (
  setup_id uuid, setup_name text, total_trade_count text, closed_trade_count text,
  unresolved_trade_count text, win_count text, loss_count text, breakeven_count text,
  win_rate text, average_risk_basis_points text, realized_pnl_by_currency jsonb
)
language sql stable security definer set search_path = ''
as $$
  select group_id, group_label, total_trade_count, closed_trade_count,
    unresolved_trade_count, win_count, loss_count, breakeven_count, win_rate,
    average_risk_basis_points, realized_pnl_by_currency
  from private.trading_statistics_performance_breakdown(
    'setup', filter_from, filter_to, filter_trading_account_id
  );
$$;

create function public.trading_statistics_by_session_type(
  filter_from date default null,
  filter_to date default null,
  filter_trading_account_id uuid default null
)
returns table (
  session_type text, total_trade_count text, closed_trade_count text,
  unresolved_trade_count text, win_count text, loss_count text, breakeven_count text,
  win_rate text, average_risk_basis_points text, realized_pnl_by_currency jsonb
)
language sql stable security definer set search_path = ''
as $$
  select group_label, total_trade_count, closed_trade_count, unresolved_trade_count,
    win_count, loss_count, breakeven_count, win_rate, average_risk_basis_points,
    realized_pnl_by_currency
  from private.trading_statistics_performance_breakdown(
    'session_type', filter_from, filter_to, filter_trading_account_id
  );
$$;

create function public.trading_statistics_by_asset(
  filter_from date default null,
  filter_to date default null,
  filter_trading_account_id uuid default null
)
returns table (
  asset text, total_trade_count text, closed_trade_count text,
  unresolved_trade_count text, win_count text, loss_count text, breakeven_count text,
  win_rate text, average_risk_basis_points text, realized_pnl_by_currency jsonb
)
language sql stable security definer set search_path = ''
as $$
  select group_label, total_trade_count, closed_trade_count, unresolved_trade_count,
    win_count, loss_count, breakeven_count, win_rate, average_risk_basis_points,
    realized_pnl_by_currency
  from private.trading_statistics_performance_breakdown(
    'asset', filter_from, filter_to, filter_trading_account_id
  );
$$;

create function public.trading_error_breakdown(
  filter_from date default null,
  filter_to date default null,
  filter_trading_account_id uuid default null
)
returns table (
  dimension text,
  label text,
  error_count text,
  affected_trade_count text
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  current_trader_id uuid;
begin
  select traders.id into current_trader_id from public.traders
  where traders.auth_user_id = auth.uid();
  if current_trader_id is null
    or (filter_from is not null and filter_to is not null and filter_to < filter_from)
    or (filter_trading_account_id is not null and not exists (
      select 1 from public.trading_accounts
      where trading_accounts.id = filter_trading_account_id
        and trading_accounts.trader_id = current_trader_id
    )) then
    raise exception using errcode = 'P0001', message = 'Trading statistics request rejected';
  end if;
  return query
  with filtered_errors as materialized (
    select trade_errors.trade_id, trade_errors.category, trade_errors.severity
    from public.trades
    join public.trade_errors on trade_errors.trade_id = trades.id
    where trades.trader_id = current_trader_id
      and (filter_from is null or trades.trade_date >= filter_from)
      and (filter_to is null or trades.trade_date <= filter_to)
      and (filter_trading_account_id is null or trades.trading_account_id = filter_trading_account_id)
  )
  select 'category', category, count(*)::text, count(distinct trade_id)::text
  from filtered_errors group by category
  union all
  select 'severity', severity, count(*)::text, count(distinct trade_id)::text
  from filtered_errors group by severity
  order by 1, 2;
end;
$$;

revoke all on function public.trading_statistics_by_setup(date, date, uuid) from public;
revoke all on function public.trading_statistics_by_session_type(date, date, uuid) from public;
revoke all on function public.trading_statistics_by_asset(date, date, uuid) from public;
revoke all on function public.trading_error_breakdown(date, date, uuid) from public;
grant execute on function public.trading_statistics_by_setup(date, date, uuid) to authenticated;
grant execute on function public.trading_statistics_by_session_type(date, date, uuid) to authenticated;
grant execute on function public.trading_statistics_by_asset(date, date, uuid) to authenticated;
grant execute on function public.trading_error_breakdown(date, date, uuid) to authenticated;
