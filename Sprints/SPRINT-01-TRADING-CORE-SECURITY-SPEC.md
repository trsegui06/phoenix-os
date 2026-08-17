# Sprint 01 — Trading Core Security Specification

## Objective

Establish the first authenticated, tenant-isolated data boundary for Trading Core. PostgreSQL Row Level Security (RLS), not UI filtering, is the authorization boundary.

## Authentication boundary

Supabase Auth creates authenticated users. A user owns at most one Trader profile through `traders.auth_user_id`, which is unique and references `auth.users(id)` in migration `0002`. The column remains nullable for administrative/bootstrap workflows; a row without that link is inaccessible to normal authenticated clients.

```text
auth.uid() -> traders.auth_user_id -> traders.id -> trader_id -> Trading Core record
```

The normal client role is `authenticated`. `anon` receives no Trading Core privileges or policies. The Supabase service role bypasses RLS and is server-only: it must never appear in browser code, `NEXT_PUBLIC_*` variables, or ordinary user workflows.

## Table access model

| Table | Ownership | Permitted authenticated operations |
| --- | --- | --- |
| `traders` | direct `auth_user_id = auth.uid()` | select, insert and update own profile |
| `prop_firms`, `trading_accounts`, `sessions`, `setups`, `trades`, `objectives`, `reviews` | direct `trader_id` | select, insert and update own rows |
| `trade_errors` | owned parent Trade | select, insert and update only through an owned Trade |
| `review_trades` | owner plus Review and Trade parents | select, insert and update only when both parents share the owner |
| `review_objectives` | owner plus Review and Objective parents | select, insert and update only when both parents share the owner |

Every insert and update has an ownership `WITH CHECK`. This prevents cross-tenant insertion and ownership reassignment. Migration `0001` composite foreign keys remain an independent integrity layer.

No normal client role receives `DELETE` on Trading Core tables. This preserves identities, accounts, trades, errors and reviews; later archival or correction flows require audited application services.

Review Trade and Objective relation sets are replaced through authenticated-only database RPCs. Each function derives the Trader from `auth.uid()`, validates the Review and the complete requested relation set before mutation, and then deletes and inserts inside one PostgreSQL transaction. The functions use a fixed empty `search_path`, expose no service-role workflow, and revoke execution from `PUBLIC`; any failure rolls back the entire relation replacement.

## Service and threat boundary

Browser and normal server clients use the publishable key and caller session, so database RLS remains active. A service-role client may only be introduced for server-side administrative or audited background work. RLS protects against UUID guessing, cross-tenant query/write attempts and reassignment attempts; it does not replace input validation, audit logging, or protection of a compromised service-role credential.

## Local validation

Supabase CLI starts PostgreSQL, Auth and PostgREST locally. Two synthetic Auth users are created through the local Auth service and mapped to two Traders. Live database tests run as `authenticated` with the users' request claims and as `anon`; they verify RLS policy enforcement, parent/junction ownership, destructive-action denial, catalog metadata, and reset/reapply from zero. No remote project is linked or used.

## Migration convention

`database/migrations/` is the single migration source of truth. For local Supabase, an ignored `supabase/migrations` junction points to that directory. It is a bridge, not a second migration history. Future files use ordered names such as `0003_description.sql` in `database/migrations/`.
