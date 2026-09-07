-- Resolve and create historical import Sessions without weakening manual Session semantics.

alter table public.sessions
  add column creation_source text not null default 'manual',
  add column creation_import_batch_id uuid,
  add constraint sessions_creation_source_check
    check (creation_source in ('manual', 'historical_import')),
  add constraint sessions_creation_provenance_check check (
    (creation_source = 'manual' and creation_import_batch_id is null)
    or
    (creation_source = 'historical_import' and creation_import_batch_id is not null)
  );

create unique index sessions_historical_import_trader_date_idx
  on public.sessions (trader_id, session_date)
  where creation_source = 'historical_import';

create function public.resolve_historical_import_sessions(
  target_dates date[],
  target_session_type text,
  target_import_batch_id uuid,
  target_selected_session_ids jsonb default '{}'::jsonb
)
returns table (
  trade_date date,
  session_id uuid,
  session_type text,
  resolution_status text,
  resolved_creation_source text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_trader_id uuid;
  requested_date date;
  selected_value jsonb;
  selected_id_text text;
  matching_count integer;
  resolved_session_id uuid;
  resolved_session_type text;
  resolved_source text;
  inserted boolean;
begin
  select traders.id into current_trader_id
  from public.traders
  where traders.auth_user_id = auth.uid();

  if current_trader_id is null
    or target_import_batch_id is null
    or target_session_type is null
    or btrim(target_session_type) = ''
    or target_selected_session_ids is null
    or jsonb_typeof(target_selected_session_ids) <> 'object'
    or coalesce(array_length(target_dates, 1), 0) < 1
    or array_length(target_dates, 1) > 500
    or exists (select 1 from unnest(target_dates) value where value is null)
    or (select count(*) from unnest(target_dates)) <>
       (select count(distinct value) from unnest(target_dates) value)
  then
    raise exception using errcode = 'P0001', message = 'Historical Session resolution rejected';
  end if;

  if exists (
    select 1
    from jsonb_each(target_selected_session_ids) selection(key, value)
    where selection.key <> all(target_dates::text[])
      or jsonb_typeof(selection.value) <> 'string'
  ) then
    raise exception using errcode = 'P0001', message = 'Historical Session selection rejected';
  end if;

  -- Validate every explicit selection and all ambiguous dates before any insert.
  foreach requested_date in array target_dates loop
    selected_value := target_selected_session_ids -> requested_date::text;
    if selected_value is not null then
      selected_id_text := selected_value #>> '{}';
      if not exists (
        select 1 from public.sessions
        where sessions.id::text = selected_id_text
          and sessions.trader_id = current_trader_id
          and sessions.session_date = requested_date
      ) then
        raise exception using errcode = 'P0001', message = 'Historical Session selection rejected';
      end if;
    else
      select count(*) into matching_count
      from public.sessions
      where sessions.trader_id = current_trader_id
        and sessions.session_date = requested_date;
      if matching_count > 1 then
        raise exception using errcode = 'P0001', message = 'Historical Session selection is ambiguous';
      end if;
    end if;
  end loop;

  foreach requested_date in array target_dates loop
    selected_value := target_selected_session_ids -> requested_date::text;
    inserted := false;

    if selected_value is not null then
      selected_id_text := selected_value #>> '{}';
      select sessions.id, sessions.session_type, sessions.creation_source
      into resolved_session_id, resolved_session_type, resolved_source
      from public.sessions
      where sessions.id::text = selected_id_text
        and sessions.trader_id = current_trader_id
        and sessions.session_date = requested_date;
    else
      select count(*) into matching_count
      from public.sessions
      where sessions.trader_id = current_trader_id
        and sessions.session_date = requested_date;

      if matching_count > 1 then
        raise exception using errcode = 'P0001', message = 'Historical Session selection is ambiguous';
      elsif matching_count = 1 then
        select sessions.id, sessions.session_type, sessions.creation_source
        into resolved_session_id, resolved_session_type, resolved_source
        from public.sessions
        where sessions.trader_id = current_trader_id
          and sessions.session_date = requested_date;
      else
        insert into public.sessions (
          trader_id, session_date, session_type, market_bias, emotional_state, notes,
          creation_source, creation_import_batch_id
        ) values (
          current_trader_id, requested_date, btrim(target_session_type), null, null, null,
          'historical_import', target_import_batch_id
        )
        on conflict (trader_id, session_date)
          where creation_source = 'historical_import'
          do nothing
        returning id, public.sessions.session_type, creation_source
        into resolved_session_id, resolved_session_type, resolved_source;

        inserted := resolved_session_id is not null;
        if not inserted then
          select sessions.id, sessions.session_type, sessions.creation_source
          into resolved_session_id, resolved_session_type, resolved_source
          from public.sessions
          where sessions.trader_id = current_trader_id
            and sessions.session_date = requested_date
            and sessions.creation_source = 'historical_import';
        end if;
      end if;
    end if;

    if resolved_session_id is null then
      raise exception using errcode = 'P0001', message = 'Historical Session resolution failed';
    end if;

    trade_date := requested_date;
    session_id := resolved_session_id;
    session_type := resolved_session_type;
    resolution_status := case when inserted then 'created' else 'existing' end;
    resolved_creation_source := resolved_source;
    return next;

    resolved_session_id := null;
    resolved_session_type := null;
    resolved_source := null;
  end loop;
end;
$$;

revoke all on function public.resolve_historical_import_sessions(date[], text, uuid, jsonb)
  from public, anon;
grant execute on function public.resolve_historical_import_sessions(date[], text, uuid, jsonb)
  to authenticated;
