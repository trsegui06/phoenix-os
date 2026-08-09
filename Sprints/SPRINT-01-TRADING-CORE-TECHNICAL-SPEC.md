# Sprint 01 — Trading Core Technical Specification

## Status

Ready for implementation

## Objective

Create the persistent relational foundation for Phoenix OS Trading Core. This sprint establishes source-of-truth PostgreSQL tables, tenant-aware ownership, referential integrity and the minimal TypeScript invariants required before application workflows are implemented.

## Scope

Source entities: Trader, Prop Firm, Trading Account, Session, Setup, Trade, Error, Objective and Review.

Statistics remain calculated read models only. No mutable statistics table, dashboard, UI workflow, Wealth model, automation or authentication policy is introduced here.

## Architecture

```text
Presentation
    ↓
Application
    ↓
Trading Domain
    ↓
Data Access
    ↓
PostgreSQL / Supabase
```

The migration belongs to the PostgreSQL/Data Access boundary. Future pages and server actions call application services, which call Trading Domain services and persistence adapters. Presentation code never queries or calculates Trading Core data directly.

## Database conventions

- PostgreSQL identifiers use `snake_case`; tables use plural nouns.
- Primary keys are UUIDs generated with `gen_random_uuid()` from `pgcrypto`.
- Audit timestamps use `timestamptz`; true day-oriented fields use `date`.
- Monetary values use `bigint` integer cents. Prices, position sizes and ratios use `numeric`; no float or double precision type is used.
- `updated_at` is stored on applicable tables but has no automatic trigger. Application services must update it explicitly, avoiding hidden write behavior before a service layer exists.
- Every historical relation uses `ON DELETE RESTRICT`. Archival/status behavior is handled by future application services, never destructive cascades.
- RLS is deliberately not enabled yet: Supabase Auth is not configured, and enabling RLS without safe policies would block access or risk an unsafe policy. Ownership columns and composite foreign keys are prepared for future RLS.

## Entity mapping

### Trader → `traders`

Purpose: Phoenix user profile and tenant root.

| Column | Type | Required | Rules |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | primary key, `gen_random_uuid()` |
| `auth_user_id` | `uuid` | no | unique future Supabase Auth link; no fragile `auth.users` FK yet |
| `name` | `text` | yes | non-empty |
| `timezone` | `text` | yes | non-empty IANA value validated by application later |
| `experience_level` | `text` | no | extensible, not an enum |
| `created_at`, `updated_at` | `timestamptz` | yes | default `now()` |

Deletion policy: restricted by all owned records. `auth_user_id` is nullable to keep the migration executable without a Supabase Auth schema while preserving future tenant/RLS compatibility.

### Prop Firm → `prop_firms`

Purpose: a trader-owned rule provider.

| Column | Type | Required | Rules |
| --- | --- | --- | --- |
| `id`, `trader_id` | `uuid` | yes | primary key; owner FK to `traders` |
| `name` | `text` | yes | non-empty |
| `rule_currency` | `varchar(3)` | yes | uppercase ISO-4217-compatible code |
| `maximum_drawdown_cents`, `daily_drawdown_cents` | `bigint` | no | non-negative integer cents in `rule_currency` |
| `payout_rule`, `consistency_rule` | `text` | no | documented rule text, no fabricated formula |
| timestamps | `timestamptz` | yes | default `now()` |

`rule_currency` makes the approved drawdown fields unambiguous. It is a rule-level currency, not a claim that every future account must share it. Index: `trader_id`. Deletion is restricted.

### Trading Account → `trading_accounts`

Purpose: a trader-owned broker or prop-firm trading account.

| Column | Type | Required | Rules |
| --- | --- | --- | --- |
| `id`, `trader_id` | `uuid` | yes | primary key and owner FK |
| `prop_firm_id` | `uuid` | no | same-trader composite FK to `prop_firms` |
| `broker`, `account_name`, `account_type`, `status` | `text` | yes | non-empty |
| `currency` | `varchar(3)` | yes | uppercase ISO-4217-compatible code |
| `initial_balance_cents` | `bigint` | yes | non-negative source input |
| `current_balance_cents` | `bigint` | no | non-negative externally observed snapshot, not a calculated ledger balance |
| `balance_updated_at` | `timestamptz` | no | required exactly when `current_balance_cents` exists |
| timestamps | `timestamptz` | yes | default `now()` |

Unique constraint: `(trader_id, broker, account_name)`. Composite ownership FK prevents cross-tenant prop-firm assignment. `current_balance_cents` is deliberately a dated broker snapshot; it is not recalculated from trades because deposits, payouts and fees are outside this approved model. Index: `trader_id`. Deletion is restricted.

### Session → `sessions`

Purpose: a trader-owned daily trading session that can contain trades.

| Column | Type | Required | Rules |
| --- | --- | --- | --- |
| `id`, `trader_id` | `uuid` | yes | primary key and owner FK |
| `session_date` | `date` | yes | calendar date from approved Data Model |
| `session_type` | `text` | yes | non-empty |
| `market_bias`, `emotional_state`, `notes` | `text` | no | optional observations |
| timestamps | `timestamptz` | yes | default `now()` |

No intraday start/end fields are added because the approved model defines `date` only. Index: `(trader_id, session_date desc)`. Deletion is restricted.

### Setup → `setups`

Purpose: a reusable, trader-owned trading configuration.

| Column | Type | Required | Rules |
| --- | --- | --- | --- |
| `id`, `trader_id` | `uuid` | yes | primary key and owner FK |
| `name`, `timeframe` | `text` | yes | non-empty |
| `market_condition` | `text` | no | optional context |
| `entry_rules`, `exit_rules`, `validation_rules` | `text` | yes | non-empty, simple extensible text instead of premature normalization |
| timestamps | `timestamptz` | yes | default `now()` |

Unique constraint: `(trader_id, name)`. Index: `trader_id`. Deletion is restricted because trades preserve setup history.

### Trade → `trades`

Purpose: the central Trading Core record.

| Column | Type | Required | Rules |
| --- | --- | --- | --- |
| `id`, `trader_id` | `uuid` | yes | primary key and owner FK |
| `session_id`, `setup_id`, `trading_account_id` | `uuid` | yes | same-trader composite FKs; each relationship is mandatory |
| `trade_date` | `date` | yes | approved calendar date |
| `asset` | `text` | yes | non-empty symbol/name |
| `direction` | `text` | yes | check: `long` or `short` |
| `entry_price` | `numeric(20,8)` | yes | greater than zero |
| `stop_loss`, `take_profit` | `numeric(20,8)` | yes | non-negative |
| `exit_price` | `numeric(20,8)` | no | non-negative when supplied |
| `risk_basis_points` | `integer` | yes | 0–10,000; one percent equals 100 basis points |
| `position_size` | `numeric(20,8)` | yes | greater than zero |
| `result` | `text` | yes | non-empty qualitative outcome; no unapproved result enum |
| `pnl_cents` | `bigint` | no | account-currency realized P&L in integer cents |
| `execution_quality` | `text` | no | optional, no invented scoring scale |
| `screenshots` | `jsonb` | yes | default empty array of storage references, never binary data |
| `notes` | `text` | no | optional |
| timestamps | `timestamptz` | yes | default `now()` |

`RR` is intentionally not persisted. It is derived from source prices and belongs to a future read model, avoiding a competing source of truth. `pnl_cents` is a source input when known; `result` remains qualitative rather than duplicating its monetary meaning. Initial indexes cover `(trader_id, trade_date desc)`, account, session and setup. Deletion is restricted.

### Error → `trade_errors`

Purpose: a recorded error attached to a trade.

| Column | Type | Required | Rules |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | primary key |
| `trade_id` | `uuid` | yes | required FK to `trades` |
| `category`, `severity`, `description` | `text` | yes | non-empty |
| `solution` | `text` | no | conservative nullable remediation |
| timestamps | `timestamptz` | yes | default `now()` |

The non-null FK enforces the approved rule that an Error cannot exist without a Trade. Index: `trade_id`. Deletion is restricted.

### Objective → `objectives`

Purpose: a trader-owned goal without unapproved goal-metric calculations.

| Column | Type | Required | Rules |
| --- | --- | --- | --- |
| `id`, `trader_id` | `uuid` | yes | primary key and owner FK |
| `title`, `status` | `text` | yes | non-empty |
| `description`, `category` | `text` | no | optional |
| `target_date` | `date` | no | optional calendar target |
| timestamps | `timestamptz` | yes | default `now()` |

Index: `(trader_id, status)`. Deletion is restricted to preserve historical reviews.

### Review → `reviews`

Purpose: a trader-owned periodic analysis of trades and objectives.

| Column | Type | Required | Rules |
| --- | --- | --- | --- |
| `id`, `trader_id` | `uuid` | yes | primary key and owner FK |
| `review_type` | `text` | yes | non-empty |
| `period_start`, `period_end` | `date` | yes | end must be on or after start |
| `summary`, `strengths`, `weaknesses`, `action_plan` | `text` | no | conservative nullable review content |
| timestamps | `timestamptz` | yes | default `now()` |

The approved `period` is normalized into explicit start/end dates. Index: `(trader_id, period_end desc)`. Deletion is restricted; validated review immutability is enforced later through application services/audit policy, not an unapproved database trigger.

### Review relations → `review_trades`, `review_objectives`

Reviews can analyse many Trades and evaluate many Objectives. The two junction tables use composite primary keys and same-trader composite FKs to prevent cross-tenant links. Each contains `review_id`, linked entity ID, `trader_id`, and `created_at`. Reverse indexes support lookup by trade or objective.

## Referential integrity

- Every Trade requires exactly one Session, one Setup and one Trading Account.
- Composite foreign keys ensure those records belong to the same Trader as the Trade.
- An Error requires one Trade.
- Review junctions are many-to-many and preserve tenant ownership.
- No `ON DELETE CASCADE` is used; all historical source records are protected by `RESTRICT`.
- No mutable statistics source table exists.

## Statistics strategy

Future read models may calculate Win Rate, Profit Factor, Average RR, Expectancy, Maximum Drawdown, Average Gain, Average Loss, Discipline Score and Phoenix Index. No SQL view, function or formula is created because the approved documents name these metrics but do not define their formulas.

## RLS preparation

`trader_id` is present on all tenant-owned source tables and is carried into review junctions. `traders.auth_user_id` is unique and nullable so a future authenticated account can be linked without a cross-schema dependency during this first local-unverified migration. The next security step is to configure Supabase Auth, backfill/require `auth_user_id` as appropriate, enable RLS and add owner-only policies. No policy is created here because a policy cannot be safely validated without that runtime.

## Data Model ambiguities requiring product validation

- Prop Firm drawdown currency and exact threshold semantics were not defined; V1 records non-negative cent values with an explicit `rule_currency`.
- Trading Account current balance cannot safely be derived from trades alone; it is an optional dated broker snapshot.
- `result`, execution quality, status and experience levels have no approved controlled vocabularies; V1 enforces non-empty text rather than fixed enums.
- `RR` has no approved formula or persistence decision; it is deferred to a read model.
- Screenshot references are JSON arrays for future Supabase Storage references; storage retention and URL policy remain open.
- Review immutability and review cadence require application policy; the schema preserves history through restrictive deletion.

## Definition of Done

Sprint 01 data foundation is complete when the migration applies to a clean PostgreSQL/Supabase database, all constraints and ownership FKs are verified, RLS ownership policy is implemented alongside functional authentication, data access adapters and domain services use this schema, and the required application/domain/database tests pass. This delivery completes only the schema foundation; it does not claim those later steps are implemented.
