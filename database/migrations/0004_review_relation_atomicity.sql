-- Replace Review relation sets atomically while deriving ownership from auth.uid().
-- SECURITY DEFINER is required because authenticated clients cannot otherwise delete
-- junction rows without retaining the non-atomic table DELETE capability from 0003.

revoke delete on table public.review_trades, public.review_objectives from authenticated;

create function public.replace_review_trade_links(
  target_review_id uuid,
  target_trade_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_trader_id uuid;
  normalized_trade_ids uuid[] := coalesce(target_trade_ids, '{}'::uuid[]);
begin
  select id into current_trader_id
  from public.traders
  where auth_user_id = auth.uid();

  if current_trader_id is null or not exists (
    select 1 from public.reviews
    where id = target_review_id and trader_id = current_trader_id
  ) then
    raise exception using errcode = 'P0001', message = 'Review relation replacement rejected';
  end if;

  if exists (
    select 1
    from unnest(normalized_trade_ids) as requested(id)
    where requested.id is null
       or not exists (
         select 1 from public.trades
         where trades.id = requested.id and trades.trader_id = current_trader_id
       )
  ) then
    raise exception using errcode = 'P0001', message = 'Review relation replacement rejected';
  end if;

  delete from public.review_trades where review_id = target_review_id;
  insert into public.review_trades (review_id, trade_id, trader_id)
  select target_review_id, requested.id, current_trader_id
  from (select distinct id from unnest(normalized_trade_ids) as ids(id)) as requested;
end;
$$;

create function public.replace_review_objective_links(
  target_review_id uuid,
  target_objective_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_trader_id uuid;
  normalized_objective_ids uuid[] := coalesce(target_objective_ids, '{}'::uuid[]);
begin
  select id into current_trader_id
  from public.traders
  where auth_user_id = auth.uid();

  if current_trader_id is null or not exists (
    select 1 from public.reviews
    where id = target_review_id and trader_id = current_trader_id
  ) then
    raise exception using errcode = 'P0001', message = 'Review relation replacement rejected';
  end if;

  if exists (
    select 1
    from unnest(normalized_objective_ids) as requested(id)
    where requested.id is null
       or not exists (
         select 1 from public.objectives
         where objectives.id = requested.id and objectives.trader_id = current_trader_id
       )
  ) then
    raise exception using errcode = 'P0001', message = 'Review relation replacement rejected';
  end if;

  delete from public.review_objectives where review_id = target_review_id;
  insert into public.review_objectives (review_id, objective_id, trader_id)
  select target_review_id, requested.id, current_trader_id
  from (select distinct id from unnest(normalized_objective_ids) as ids(id)) as requested;
end;
$$;

revoke all on function public.replace_review_trade_links(uuid, uuid[]) from public;
revoke all on function public.replace_review_objective_links(uuid, uuid[]) from public;
grant execute on function public.replace_review_trade_links(uuid, uuid[]) to authenticated;
grant execute on function public.replace_review_objective_links(uuid, uuid[]) to authenticated;
