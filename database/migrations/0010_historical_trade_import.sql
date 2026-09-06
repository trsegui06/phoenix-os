-- Support authenticated historical Trade imports with truthful unknown risk and durable idempotency.

alter table public.trades alter column risk_basis_points drop not null;

alter table public.trades
  add column import_source text,
  add column external_account_id text,
  add column external_trade_id text,
  add column import_batch_id uuid,
  add column import_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(import_metadata) = 'object'),
  add constraint trades_import_provenance_complete_check check (
    (import_source is null and external_account_id is null and external_trade_id is null and import_batch_id is null)
    or
    (btrim(import_source) <> '' and btrim(external_account_id) <> '' and btrim(external_trade_id) <> '' and import_batch_id is not null)
  ),
  add constraint trades_unknown_risk_requires_import_check check (
    risk_basis_points is not null or import_source is not null
  );

create unique index trades_import_external_identity_idx
  on public.trades (trader_id, trading_account_id, import_source, external_account_id, external_trade_id)
  where external_trade_id is not null;

drop function public.create_trade_with_errors(
  uuid, uuid, uuid, date, text, text, numeric, numeric, numeric, integer,
  numeric, text, numeric, bigint, text, text, jsonb
);

create function public.create_trade_with_errors(
  target_trading_account_id uuid, target_session_id uuid, target_setup_id uuid,
  target_trade_date date, target_asset text, target_direction text,
  target_entry_price numeric, target_stop_loss numeric, target_take_profit numeric,
  target_risk_basis_points integer, target_position_size numeric, target_result text,
  target_exit_price numeric default null, target_pnl_cents bigint default null,
  target_execution_quality text default null, target_notes text default null,
  target_errors jsonb default '[]'::jsonb, target_import_source text default null,
  target_external_account_id text default null, target_external_trade_id text default null,
  target_import_batch_id uuid default null, target_import_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare current_trader_id uuid; new_trade_id uuid; error_item jsonb;
begin
  select id into current_trader_id from public.traders where auth_user_id = auth.uid();
  if current_trader_id is null
    or not exists (select 1 from public.trading_accounts where id=target_trading_account_id and trader_id=current_trader_id)
    or not exists (select 1 from public.sessions where id=target_session_id and trader_id=current_trader_id)
    or not exists (select 1 from public.setups where id=target_setup_id and trader_id=current_trader_id)
    or jsonb_typeof(coalesce(target_errors, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(target_import_metadata, '{}'::jsonb)) <> 'object'
    or (target_risk_basis_points is null and (
      nullif(btrim(target_import_source), '') is null
      or nullif(btrim(target_external_account_id), '') is null
      or nullif(btrim(target_external_trade_id), '') is null
      or target_import_batch_id is null
    ))
  then raise exception using errcode='P0001', message='Trade entry rejected'; end if;

  insert into public.trades (
    trader_id, trading_account_id, session_id, setup_id, trade_date, asset, direction,
    entry_price, stop_loss, take_profit, exit_price, risk_basis_points, position_size,
    result, pnl_cents, execution_quality, screenshots, notes, import_source,
    external_account_id, external_trade_id, import_batch_id, import_metadata
  ) values (
    current_trader_id, target_trading_account_id, target_session_id, target_setup_id,
    target_trade_date, target_asset, target_direction, target_entry_price, target_stop_loss,
    target_take_profit, target_exit_price, target_risk_basis_points, target_position_size,
    target_result, target_pnl_cents, target_execution_quality, '[]'::jsonb, target_notes,
    target_import_source, target_external_account_id, target_external_trade_id,
    target_import_batch_id, coalesce(target_import_metadata, '{}'::jsonb)
  ) returning id into new_trade_id;

  for error_item in select value from jsonb_array_elements(coalesce(target_errors, '[]'::jsonb)) loop
    insert into public.trade_errors (trade_id, category, severity, description, solution)
    values (new_trade_id, error_item->>'category', error_item->>'severity',
      error_item->>'description', nullif(btrim(error_item->>'solution'), ''));
  end loop;
  return new_trade_id;
end; $$;

revoke all on function public.create_trade_with_errors(
  uuid,uuid,uuid,date,text,text,numeric,numeric,numeric,integer,numeric,text,
  numeric,bigint,text,text,jsonb,text,text,text,uuid,jsonb
) from public, anon;
grant execute on function public.create_trade_with_errors(
  uuid,uuid,uuid,date,text,text,numeric,numeric,numeric,integer,numeric,text,
  numeric,bigint,text,text,jsonb,text,text,text,uuid,jsonb
) to authenticated;
