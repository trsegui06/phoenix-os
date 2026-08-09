-- Phoenix OS Sprint 01: Trading Core source-of-truth schema.
-- This migration deliberately contains no RLS policies: Supabase Auth is not yet
-- configured, and a permissive policy would expose financial data.

create extension if not exists pgcrypto;

create table traders (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text not null check (btrim(name) <> ''),
  timezone text not null check (btrim(timezone) <> ''),
  experience_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table prop_firms (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references traders(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  rule_currency varchar(3) not null check (rule_currency ~ '^[A-Z]{3}$'),
  maximum_drawdown_cents bigint check (maximum_drawdown_cents >= 0),
  daily_drawdown_cents bigint check (daily_drawdown_cents >= 0),
  payout_rule text,
  consistency_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, trader_id)
);

create table trading_accounts (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references traders(id) on delete restrict,
  prop_firm_id uuid,
  broker text not null check (btrim(broker) <> ''),
  account_name text not null check (btrim(account_name) <> ''),
  account_type text not null check (btrim(account_type) <> ''),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  initial_balance_cents bigint not null check (initial_balance_cents >= 0),
  current_balance_cents bigint check (current_balance_cents >= 0),
  balance_updated_at timestamptz,
  status text not null check (btrim(status) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, trader_id),
  unique (trader_id, broker, account_name),
  foreign key (prop_firm_id, trader_id)
    references prop_firms(id, trader_id) on delete restrict,
  check (
    (current_balance_cents is null and balance_updated_at is null)
    or (current_balance_cents is not null and balance_updated_at is not null)
  )
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references traders(id) on delete restrict,
  session_date date not null,
  session_type text not null check (btrim(session_type) <> ''),
  market_bias text,
  emotional_state text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, trader_id)
);

create table setups (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references traders(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  timeframe text not null check (btrim(timeframe) <> ''),
  market_condition text,
  entry_rules text not null check (btrim(entry_rules) <> ''),
  exit_rules text not null check (btrim(exit_rules) <> ''),
  validation_rules text not null check (btrim(validation_rules) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, trader_id),
  unique (trader_id, name)
);

create table trades (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references traders(id) on delete restrict,
  session_id uuid not null,
  setup_id uuid not null,
  trading_account_id uuid not null,
  trade_date date not null,
  asset text not null check (btrim(asset) <> ''),
  direction text not null check (direction in ('long', 'short')),
  entry_price numeric(20, 8) not null check (entry_price > 0),
  stop_loss numeric(20, 8) not null check (stop_loss >= 0),
  take_profit numeric(20, 8) not null check (take_profit >= 0),
  exit_price numeric(20, 8) check (exit_price >= 0),
  risk_basis_points integer not null check (risk_basis_points between 0 and 10000),
  position_size numeric(20, 8) not null check (position_size > 0),
  result text not null check (btrim(result) <> ''),
  pnl_cents bigint,
  execution_quality text,
  screenshots jsonb not null default '[]'::jsonb check (jsonb_typeof(screenshots) = 'array'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, trader_id),
  foreign key (session_id, trader_id)
    references sessions(id, trader_id) on delete restrict,
  foreign key (setup_id, trader_id)
    references setups(id, trader_id) on delete restrict,
  foreign key (trading_account_id, trader_id)
    references trading_accounts(id, trader_id) on delete restrict
);

create table trade_errors (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete restrict,
  category text not null check (btrim(category) <> ''),
  severity text not null check (btrim(severity) <> ''),
  description text not null check (btrim(description) <> ''),
  solution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table objectives (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references traders(id) on delete restrict,
  title text not null check (btrim(title) <> ''),
  description text,
  category text,
  target_date date,
  status text not null check (btrim(status) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, trader_id)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references traders(id) on delete restrict,
  review_type text not null check (btrim(review_type) <> ''),
  period_start date not null,
  period_end date not null,
  summary text,
  strengths text,
  weaknesses text,
  action_plan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, trader_id),
  check (period_end >= period_start)
);

create table review_trades (
  review_id uuid not null,
  trade_id uuid not null,
  trader_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (review_id, trade_id),
  foreign key (review_id, trader_id)
    references reviews(id, trader_id) on delete restrict,
  foreign key (trade_id, trader_id)
    references trades(id, trader_id) on delete restrict
);

create table review_objectives (
  review_id uuid not null,
  objective_id uuid not null,
  trader_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (review_id, objective_id),
  foreign key (review_id, trader_id)
    references reviews(id, trader_id) on delete restrict,
  foreign key (objective_id, trader_id)
    references objectives(id, trader_id) on delete restrict
);

create index prop_firms_trader_id_idx on prop_firms (trader_id);
create index trading_accounts_trader_id_idx on trading_accounts (trader_id);
create index sessions_trader_date_idx on sessions (trader_id, session_date desc);
create index setups_trader_id_idx on setups (trader_id);
create index trades_trader_date_idx on trades (trader_id, trade_date desc);
create index trades_account_id_idx on trades (trading_account_id);
create index trades_session_id_idx on trades (session_id);
create index trades_setup_id_idx on trades (setup_id);
create index trade_errors_trade_id_idx on trade_errors (trade_id);
create index objectives_trader_status_idx on objectives (trader_id, status);
create index reviews_trader_period_idx on reviews (trader_id, period_end desc);
create index review_trades_trade_id_idx on review_trades (trade_id);
create index review_objectives_objective_id_idx on review_objectives (objective_id);
