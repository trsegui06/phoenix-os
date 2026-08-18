-- Enforce the least-privilege Data API boundary for Phoenix-owned public objects.

revoke all privileges on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;

revoke all privileges on table
  public.traders,
  public.prop_firms,
  public.trading_accounts,
  public.sessions,
  public.setups,
  public.trades,
  public.trade_errors,
  public.objectives,
  public.reviews,
  public.review_trades,
  public.review_objectives
from public, anon;

grant select, insert, update on table
  public.traders,
  public.prop_firms,
  public.trading_accounts,
  public.sessions,
  public.setups,
  public.trades,
  public.trade_errors,
  public.objectives,
  public.reviews,
  public.review_trades,
  public.review_objectives
to authenticated;

revoke delete, truncate, references, trigger on table
  public.traders,
  public.prop_firms,
  public.trading_accounts,
  public.sessions,
  public.setups,
  public.trades,
  public.trade_errors,
  public.objectives,
  public.reviews,
  public.review_trades,
  public.review_objectives
from authenticated;

revoke all privileges on all sequences in schema public from public, anon, authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_current_trader(uuid) to authenticated;
grant execute on function public.replace_review_trade_links(uuid, uuid[]) to authenticated;
grant execute on function public.replace_review_objective_links(uuid, uuid[]) to authenticated;
grant execute on function public.trading_statistics_overview(date, date, uuid) to authenticated;
grant execute on function public.trading_statistics_by_setup(date, date, uuid) to authenticated;
grant execute on function public.trading_statistics_by_session_type(date, date, uuid) to authenticated;
grant execute on function public.trading_statistics_by_asset(date, date, uuid) to authenticated;
grant execute on function public.trading_error_breakdown(date, date, uuid) to authenticated;
grant execute on function public.create_trade_with_errors(
  uuid, uuid, uuid, date, text, text, numeric, numeric, numeric, integer,
  numeric, text, numeric, bigint, text, text, jsonb
) to authenticated;

-- Phoenix migrations run as postgres. Future public objects must opt into Data API access.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
