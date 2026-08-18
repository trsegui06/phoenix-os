# Phoenix OS — Release Hardening Gate 2: Database Privilege Hardening

**Baseline:** `2fe8d41 ci: stabilize Playwright dependency install`

**Scope:** B-08 public-schema least privilege only

**Feature freeze:** Active

**Gate result:** **PENDING REMOTE CI** — local migration, catalog and functional regression are green; B-08 closes only after all five remote release checks pass.

## Baseline evidence

The live pre-`0008` catalog showed the same inherited Supabase default grants on all 11 Phoenix tables:

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `anon` | No | No | No | No | **Yes** | **Yes** | **Yes** |
| `authenticated` | Yes | Yes | Yes | No | **Yes** | **Yes** | **Yes** |
| `service_role` | No | No | No | No | Yes | Yes | Yes |

RLS was enabled on every table. `anon` and `authenticated` were non-superuser roles without `BYPASSRLS`, `CREATEROLE`, or `CREATEDB`. `service_role` retained provider-defined `BYPASSRLS`; Phoenix application code does not use that role.

All nine public functions were `SECURITY DEFINER`, used an empty `search_path`, allowed `authenticated` execution, and denied `anon` and `PUBLIC`. The four public breakdown wrappers delegate to an invoker helper in the inaccessible `private` schema; the helper derives the current Trader through `auth.uid()` and has no Data API execute grant.

The `public` schema already denied `CREATE`, but `PUBLIC` inherited `USAGE`. Defaults for future `postgres`-owned public tables would automatically grant `TRUNCATE`, `REFERENCES`, and `TRIGGER` to Data API roles. No public sequences existed.

## Required application model

Repository and service inspection confirms that current user flows need direct `SELECT`, `INSERT`, and `UPDATE` on all 11 tables under RLS. They need no direct `DELETE`, `TRUNCATE`, `REFERENCES`, or `TRIGGER`:

- onboarding inserts and reads the current user's `traders` row;
- Account, Session, Setup, Trade, Trade Error, Objective, and Review repositories use create/read/update only;
- relationship reads use `review_trades` and `review_objectives` directly;
- relationship replacement deletes only inside authenticated, owner-validating `SECURITY DEFINER` RPCs;
- atomic Trade plus Errors creation and all statistics remain RPC-mediated.

RLS remains the row-level authorization boundary after PostgreSQL grants permit the required operation.

## Migration 0008

`database/migrations/0008_harden_public_privileges.sql` is forward-only and changes no schema shape or data. It:

- removes schema privileges from `PUBLIC`, `anon`, and `authenticated`, then grants only schema `USAGE` to the Data API roles;
- revokes all table access from `PUBLIC` and `anon`;
- grants exactly `SELECT`, `INSERT`, and `UPDATE` on the explicit 11-table allow-list to `authenticated`;
- revokes `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER` from `authenticated`;
- denies Data API access to any public sequence;
- revokes function execution from `PUBLIC`, `anon`, and `authenticated`, then restores only the nine explicit authenticated RPC signatures;
- removes future table, sequence, and function grants to `PUBLIC`, `anon`, and `authenticated` from the `postgres` migration owner's public-schema default ACL.

The migration intentionally does not change `service_role`, `supabase_admin`, or any managed schema. Future Phoenix objects must opt into access with an explicit reviewed grant.

## Target privilege matrix

The target applies identically to `traders`, `prop_firms`, `trading_accounts`, `sessions`, `setups`, `trades`, `trade_errors`, `objectives`, `reviews`, `review_trades`, and `review_objectives`:

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `anon` | No | No | No | No | No | No | No |
| `authenticated` | Yes | Yes | Yes | No | No | No | No |

`PUBLIC` has no schema usage/create, table grant, sequence grant, or function execution. `anon` and `authenticated` have schema usage but no create privilege.

## Catalog regression

`tests/integration/database-privileges.supabase.test.ts` queries the running PostgreSQL catalog through the disposable local database container. It does not parse migration text. The test:

- compares the complete public table inventory to the 11-table allow-list so a new table requires a deliberate policy update;
- checks all seven table privileges for both Data API roles;
- checks public-schema usage/create;
- enumerates the exact nine public functions and asserts definer mode, empty search path, execute ACL, identity derivation/delegation, and absence of dynamic SQL;
- audits the private statistics helper reached by four wrappers;
- verifies `anon` and `authenticated` cannot bypass RLS or administer roles/databases;
- asserts no `postgres` default ACL can reintroduce grants to `PUBLIC`, `anon`, or `authenticated`.

The existing Supabase Integration job discovers this test automatically.

## Local evidence

- clean apply and reset/reapply of migrations `0001`–`0008`: PASS;
- focused catalog tests: 4/4 PASS;
- complete live Vitest suite: 31 files, 175/175 PASS;
- generated database types: regenerated, byte-for-byte unchanged;
- RLS, onboarding, CRUD, review replacement atomicity, trade/error atomicity, statistics A/B, and public Auth: PASS through the existing live suite.
- Playwright against a freshly reset local stack: 10/10 PASS;
- format, lint, TypeScript, and production build: PASS;
- production dependency audit: no known vulnerabilities.

Local execution used Node `24.19.0` and pnpm `11.19.0`; the release workflow remains the authority for the pinned Node `24.14.0` and pnpm `11.16.0` toolchain.

## B-08 decision

| State | Result |
| --- | --- |
| Previous | OPEN / HIGH |
| Current | PENDING REMOTE CI |
| Closure rule | CLOSED only after Quality, Unit Tests, Supabase Integration, E2E, and Build & Security are green remotely |

No product behavior, business rule, Auth flow, historical migration, or service-role dependency changed.
