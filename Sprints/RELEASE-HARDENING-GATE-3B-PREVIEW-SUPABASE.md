# Phoenix OS — Release Hardening Gate 3B: Preview Supabase

**Baseline:** `2db2c49 ci: normalize Ubuntu apt mirror list`

**Scope:** B-02 hosted Preview provisioning, migration, and remote security proof

**Feature freeze:** Active

**Gate result:** **PASS / B-02 PARTIALLY CLOSED** — the dedicated Preview database is provisioned through migration `0008`, its remote catalog and empty data state are verified, and the local application regression is green. Production Supabase does not exist, so B-02 remains partially closed.

## Target proof

| Property | Verified value |
| --- | --- |
| Environment | Preview only |
| Project | `phoenix-preview` |
| Project ref | `ptmqofqpssygvokufevz` |
| Region | Central EU / Frankfurt |
| Production mutation | None; no production project exists |

The authenticated Supabase project inventory and the CLI link state independently matched the expected project ref before any migration write. Developers must repeat this target check before every linked remote command. CLI runtime state under `supabase/.temp` is ignored and must never be committed.

## Credential incident and mitigation

Supabase CLI diagnostic output exposed a database credential during a dry-run diagnostic. The value is omitted. Official Supabase Management API behavior and the `cli_login_postgres` identity established that it was a temporary CLI login-role password, not the long-lived `postgres` project password. The supported `DELETE /v1/projects/{ref}/cli/login-role` endpoint returned its success confirmation and invalidated the relevant temporary CLI login roles before audit continuation.

Remote `supabase db dump --dry-run` is prohibited for future Phoenix audits because it prints the generated connection script, including its temporary password. Catalog verification must instead use the Supabase Management API read-only SQL endpoint or another client that emits query results only. Access tokens, database passwords, service-role values, JWTs, and connection strings must never enter command output or repository files.

## Migration proof

- The initial migration list showed local `0001`–`0008` and no Phoenix migration remotely.
- The mandatory `db push --dry-run` listed exactly migrations `0001`–`0008`.
- The write confirmation named Preview, `phoenix-preview`, and `ptmqofqpssygvokufevz`, with seed and remote reset both disabled.
- `db push` applied `0001`–`0008` successfully.
- The post-write migration list aligned all eight local and remote versions.
- The second dry run reported the remote database up to date.
- No seed, migration repair, remote reset, config push, manual dashboard SQL, or production command was used.

## Remote catalog proof

The catalog was queried through `POST /v1/projects/{ref}/database/query/read-only`. The query was schema-qualified, read-only, and returned catalog results without connection details.

### Tables and RLS

All 11 expected public tables exist and have RLS enabled:

`traders`, `prop_firms`, `trading_accounts`, `sessions`, `setups`, `trades`, `trade_errors`, `objectives`, `reviews`, `review_trades`, and `review_objectives`.

Result: **11/11 tables, 11/11 RLS enabled**.

The 35 remote policies are limited to `authenticated` and preserve the owner-only design. Trader ownership is rooted in `auth.uid() = auth_user_id`; dependent entities use `is_current_trader`; Trade Error and Review junction checks also validate their parent relationships. The two junction tables retain owner-validating DELETE policies required by their definer replacement functions, while direct DELETE privilege remains denied. No historical entity exposes a DELETE policy or direct DELETE grant.

### Privileges and default ACL

| Role | Schema CREATE | Schema USAGE | Table SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PUBLIC` | No | No | No direct grant | No | No | No | No | No | No |
| `anon` | No | Yes | No | No | No | No | No | No | No |
| `authenticated` | No | Yes | Yes | Yes | Yes | No | No | No | No |

The `postgres` public-schema default ACL grants no future table, sequence, or function privilege to `PUBLIC`, `anon`, or `authenticated`. Managed `service_role` and Supabase administration semantics were not modified.

### RPC and roles

Exactly nine approved public RPC signatures exist:

- `is_current_trader`
- `replace_review_trade_links`
- `replace_review_objective_links`
- `trading_statistics_overview`
- `trading_statistics_by_setup`
- `trading_statistics_by_session_type`
- `trading_statistics_by_asset`
- `trading_error_breakdown`
- `create_trade_with_errors`

All nine are `SECURITY DEFINER`, set an empty fixed `search_path`, deny execution to `PUBLIC` and `anon`, and grant execution to `authenticated` only. The `anon` and `authenticated` roles are not superusers and have neither `BYPASSRLS`, `CREATEDB`, nor `CREATEROLE`. The hosted `auth` schema exists; no Auth user or hosted Auth/SMTP setting was created or changed.

## Generated types and data

The Management API generated TypeScript types from the linked Preview public schema without exposing connection credentials. Current generator output differs textually because it adds internal PostgREST metadata, uses a different union layout, and formats helper generics differently. After excluding generator-only metadata and formatting, the complete canonical `Database` schema type is identical to `lib/supabase/database.types.ts` (11,460 canonical characters on both sides). The committed file was not overwritten.

Exact `count(*)` queries returned zero for every Phoenix table. The database contains no real user data, seed data, or synthetic fixture rows.

## Local regression

- format: PASS;
- lint: PASS;
- TypeScript: PASS;
- Vitest: PASS — 18 files and 161 tests passed; 14 files and 23 tests skipped by the normal non-live suite;
- production build: PASS with non-secret HTTPS placeholders;
- production dependency audit: PASS — no known vulnerabilities.

Local execution used Node `24.19.0` and pnpm `11.19.0`; CI remains authoritative for the repository-pinned Node `24.14.0` and pnpm `11.16.0` toolchain. Normal tests were not pointed at Preview.

## Release blockers

| Blocker | Current state | Evidence / remaining work |
| --- | --- | --- |
| B-01 | PARTIALLY CLOSED | Hosting architecture exists; Vercel staging, domain, TLS, and scoped variable proof remain |
| B-02 | PARTIALLY CLOSED | Preview is provisioned and audited; a separate Production Supabase project and production proof remain |
| B-03 | OPEN | Production-like email confirmation, SMTP, and deliverability remain Gate 4 work |

## Next task

Configure Vercel staging with the Preview Supabase public URL and publishable key, bind `staging.phoenixtradingos.com`, and perform the first remote staging smoke test. Public values belong in Vercel's Preview scope only; no secret value belongs in Git.
