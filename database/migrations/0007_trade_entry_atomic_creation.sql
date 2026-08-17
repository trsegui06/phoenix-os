-- Atomically create one owned Trade and its optional Trade Errors.
create function public.create_trade_with_errors(
  target_trading_account_id uuid, target_session_id uuid, target_setup_id uuid,
  target_trade_date date, target_asset text, target_direction text,
  target_entry_price numeric, target_stop_loss numeric, target_take_profit numeric,
  target_risk_basis_points integer, target_position_size numeric, target_result text,
  target_exit_price numeric default null, target_pnl_cents bigint default null,
  target_execution_quality text default null, target_notes text default null,
  target_errors jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare current_trader_id uuid; new_trade_id uuid; error_item jsonb;
begin
  select id into current_trader_id from public.traders where auth_user_id = auth.uid();
  if current_trader_id is null
    or not exists (select 1 from public.trading_accounts where id=target_trading_account_id and trader_id=current_trader_id)
    or not exists (select 1 from public.sessions where id=target_session_id and trader_id=current_trader_id)
    or not exists (select 1 from public.setups where id=target_setup_id and trader_id=current_trader_id)
    or jsonb_typeof(coalesce(target_errors, '[]'::jsonb)) <> 'array'
  then raise exception using errcode='P0001', message='Trade entry rejected'; end if;

  insert into public.trades (
    trader_id, trading_account_id, session_id, setup_id, trade_date, asset, direction,
    entry_price, stop_loss, take_profit, exit_price, risk_basis_points, position_size,
    result, pnl_cents, execution_quality, screenshots, notes
  ) values (
    current_trader_id, target_trading_account_id, target_session_id, target_setup_id,
    target_trade_date, target_asset, target_direction, target_entry_price, target_stop_loss,
    target_take_profit, target_exit_price, target_risk_basis_points, target_position_size,
    target_result, target_pnl_cents, target_execution_quality, '[]'::jsonb, target_notes
  ) returning id into new_trade_id;

  for error_item in select value from jsonb_array_elements(coalesce(target_errors, '[]'::jsonb)) loop
    insert into public.trade_errors (trade_id, category, severity, description, solution)
    values (new_trade_id, error_item->>'category', error_item->>'severity',
      error_item->>'description', nullif(btrim(error_item->>'solution'), ''));
  end loop;
  return new_trade_id;
end; $$;
revoke all on function public.create_trade_with_errors(uuid,uuid,uuid,date,text,text,numeric,numeric,numeric,integer,numeric,text,numeric,bigint,text,text,jsonb) from public, anon;
grant execute on function public.create_trade_with_errors(uuid,uuid,uuid,date,text,text,numeric,numeric,numeric,integer,numeric,text,numeric,bigint,text,text,jsonb) to authenticated;
