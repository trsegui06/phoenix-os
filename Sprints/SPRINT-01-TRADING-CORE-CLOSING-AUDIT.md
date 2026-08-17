# Sprint 01 — Trading Core Closing Audit

## Executive summary

Sprint 01 is complete for its approved Trading Core scope. The seven application slices, PostgreSQL schema, authenticated ownership boundary, RLS policies, atomic Review relation replacement, and local integration path are implemented and reproducible. Two clean local resets applied migrations `0001` through `0004`, and the live regression passed all 79 tests.

No CRITICAL defect remains. This audit corrected two concrete, low-risk defects: Trading Account cent values now reject unsafe JavaScript integers at both input and database mapping boundaries, and Vitest now allows 30 seconds for local Supabase integration tests so the documented `pnpm test` command is stable.

The foundation is ready for Trading Statistics / Read Models v1. It is not yet a production-complete product: deployment/CI, audit-version history for mutable records, generated database types, controlled vocabularies, and metric definitions remain future work.

## Implementation inventory

Classification meanings: ACTIVE is current Trading Core implementation; SHARED supports multiple slices; GENERATED is local tooling output and must remain untracked; LEGACY is retained compatibility or historical context; POSSIBLY DEAD has no current import; DUPLICATED is active but materially repeated.

### Domain

- ACTIVE: `domain/trading/trading-account.ts`, `trading-session.ts`, `trading-setup.ts`, `trade.ts`, `trade-error.ts`, `trading-objective.ts`, `trading-review.ts`.
- SHARED: `domain/trading/invariants.ts`.
- POSSIBLY DEAD: `domain/trading/types.ts`; its four exported types have no consumers and its bigint account shape differs from the active number-based model. Do not remove until the Read Model contracts are decided.

### Data

- ACTIVE: all seven files in `data/trading/`: Account, Session, Setup, Trade, Trade Error, Objective, and Review repositories.
- DUPLICATED (LOW): row aliases, explicit column lists, row mappers, CRUD result shapes, and timestamp updates repeat intentionally across repositories.
- No generated Supabase database types are present.

### Services

- ACTIVE: the seven entity service files in `services/trading/`.
- SHARED: `services/trading/errors.ts`.
- DUPLICATED (MEDIUM): current-Trader resolution appears in all seven services.
- LEGACY: `TradingAccountErrorCode` and `TradingAccountApplicationError` are compatibility aliases. They are still imported, so they are not dead.

### Server actions

- ACTIVE: all seven files in `app/actions/`.
- DUPLICATED (LOW): server-client acquisition and thin CRUD adapters.
- Every file is server-only and contains no delete action or business rule.

### Database and Supabase

- ACTIVE: `database/migrations/0001_trading_core.sql` through `0004_review_relation_atomicity.sql` and `supabase/config.toml`.
- LEGACY/HISTORICAL: `0003` records the intermediate direct junction-delete design. `0004` revokes that table privilege and supersedes it with RPCs; migration history must not be rewritten.
- GENERATED: ignored `supabase/migrations` junction and `supabase/.temp` runtime state. The junction bridges to the single migration source; `.temp` is removed after validation.
- No duplicated migration history exists.

### Tests

- ACTIVE: nine unit files, seven local Supabase integration files, and one Playwright E2E file.
- SHARED/DUPLICATED (LOW): integration user/trader bootstrap is repeated explicitly in each suite.
- Coverage: 72 non-Supabase tests, seven integration tests, and one E2E test; 79 Vitest tests total when Supabase is configured.

### Documentation

- ACTIVE: both Sprint 01 specifications, ADR-001, `docs/DataModel.md`, `Development.md`, `BusinessRules.md`, `Architecture.md`, `PRD.md`, and `ProductBacklog.md`.
- LEGACY/HISTORICAL: ADR-001 context correctly describes the pre-implementation decision point, but should not be read as current repository state.
- STALE (LOW): the technical spec status remains “Ready for implementation”; `Development.md` still says persistence is optional/unimplemented; the security migration example still says `0003_description.sql`; Product Backlog still marks Trading Core planned. These are documentation follow-ups, not runtime defects.
- OUT OF SCOPE: Sprint 06 Wealth documentation is unrelated to this audit.

No abandoned implementation path, TODO, or FIXME was found.

## Domain coverage and schema consistency

| Entity | Verdict | Domain and schema status |
| --- | --- | --- |
| Trading Account | PASS | Entity/Create/Update exist; ownership excluded; nullable snapshot pair matches DB; cents safe-integer correction applied. `propFirmId` relies on PostgreSQL UUID/FK validation rather than domain UUID validation. |
| Session | PASS | Required date/type and nullable observations match DB. |
| Setup | PASS | Required rules and nullable market condition match DB. |
| Trade | PASS | Required owned parents, dates, direction, numerics, signed nullable P&L cents, JSONB screenshots, and nullability match DB. |
| Trade Error | PASS | Required immutable Trade parent and nullable solution match DB. |
| Objective | PASS | Required title/status and optional date/text fields match DB. |
| Review | PASS | Period constraint and nullable text match DB; relation arrays are deduplicated and ownership-free. |

Storage `snake_case` is contained in repositories and migrations. Domain/API contracts use camelCase. UUIDs and date-only values are strings; timestamps are ISO strings; screenshots are string arrays mapped to/from JSONB. PostgreSQL `numeric(20,8)` is mapped to JS `number`, which is acceptable for current display/source-entry workflows but not for exact arbitrary-precision calculation.

Known consistency qualifications:

- Partial Review period updates cannot be validated against the stored counterpart in the domain alone; the database constraint remains the final boundary and the service returns a safe persistence error.
- Trading Account `propFirmId` lacks early UUID validation, but RLS/composite FK integrity is preserved.
- Session, Setup, and Account validators are typed rather than uniformly defensive against arbitrary runtime values; malformed untyped payloads may produce generic exceptions before persistence.
- Free-text status/result/category fields intentionally mirror the database and approved technical spec; analytics must not invent vocabularies.

## Migration and live database status

- `0001`: deterministic source schema; UUID keys, composite ownership FKs, checks, indexes, restrictive deletes, cents/basis-point/numeric/date/JSONB choices verified.
- `0002`: Auth FK, all-table RLS, authenticated SELECT/INSERT/UPDATE, and ownership policies verified.
- `0003`: historically necessary for the former client-side relation replacement; its DELETE policies remain but are unreachable to authenticated callers after `0004` revokes table DELETE.
- `0004`: atomic Trade and Objective link replacement, full-set validation before delete, duplicate normalization, empty-set support, authenticated-only execution, and transaction rollback verified.
- First apply: PASS (`0001` → `0002` → `0003` → `0004`).
- First reset/reapply: PASS.
- Second reset/reapply: PASS.
- Manual SQL intervention: none.
- Remote database: none.

All 17 foreign keys report restrictive delete behavior; no cascade exists.

## RLS matrix

| Table | RLS | Policies | Authenticated operations | Ownership | DELETE |
| --- | --- | ---: | --- | --- | --- |
| `traders` | enabled | 3 | SELECT, INSERT, UPDATE | direct `auth_user_id` | none |
| `prop_firms` | enabled | 3 | SELECT, INSERT, UPDATE | direct `trader_id` | none |
| `trading_accounts` | enabled | 3 | SELECT, INSERT, UPDATE | direct `trader_id` | none |
| `sessions` | enabled | 3 | SELECT, INSERT, UPDATE | direct `trader_id` | none |
| `setups` | enabled | 3 | SELECT, INSERT, UPDATE | direct `trader_id` | none |
| `trades` | enabled | 3 | SELECT, INSERT, UPDATE | direct `trader_id` plus same-owner parents | none |
| `trade_errors` | enabled | 3 | SELECT, INSERT, UPDATE | indirect through owned Trade | none |
| `objectives` | enabled | 3 | SELECT, INSERT, UPDATE | direct `trader_id` | none |
| `reviews` | enabled | 3 | SELECT, INSERT, UPDATE | direct `trader_id` | none |
| `review_trades` | enabled | 4 | SELECT, INSERT, UPDATE | Review + Trade + owner | table DELETE revoked; RPC only |
| `review_objectives` | enabled | 4 | SELECT, INSERT, UPDATE | Review + Objective + owner | table DELETE revoked; RPC only |

The ownership chain is consistently `auth.uid()` → `traders.auth_user_id` → Trader UUID → resource `trader_id`. No repository, service, or action accepts caller ownership as authoritative. User workflows contain no service-role client.

## SECURITY DEFINER audit

| Function | Need | search_path | Qualification | Execute |
| --- | --- | --- | --- | --- |
| `is_current_trader(uuid)` | RLS ownership lookup without recursive policy interference | fixed empty | fully qualified | authenticated only |
| `replace_review_trade_links(uuid, uuid[])` | atomic junction replacement after table DELETE revocation | fixed empty | fully qualified | authenticated only |
| `replace_review_objective_links(uuid, uuid[])` | atomic junction replacement after table DELETE revocation | fixed empty | fully qualified | authenticated only |

Live catalog confirmed PostgreSQL owner `postgres`, `prosecdef=true`, `search_path=""`, PUBLIC execute false, anon execute false, and authenticated execute true for all three. Review RPC ownership is derived internally from `auth.uid()`; no trusted ownership parameter exists.

## Application architecture

### Error model

The shared codes are stable: `UNAUTHENTICATED`, `TRADER_PROFILE_NOT_FOUND`, `VALIDATION_ERROR`, entity-specific `*_NOT_FOUND`, `CONFLICT`, and `PERSISTENCE_ERROR`. Supabase/PostgreSQL error objects are not returned to callers. Account and Setup map unique violations to safe conflicts; other persistence failures use safe generic messages.

The Account-named error aliases are retained compatibility, not a competing model. Persistence helper names differ but behavior is consistent enough for Read Models.

### Current-Trader resolution

Seven services independently perform the same Auth user lookup and Trader query. Behavior is materially consistent, but repetition increases the chance that a future Read Model diverges on authentication or error semantics.

Decision: extract a shared, tested application helper immediately before or as the first step of Read Models, not during this closing audit. This is high-value and low conceptual risk, but changing all seven security-sensitive services during an audit would expand the regression surface unnecessarily.

### Validation

Stable repeated primitives include required trimmed text, optional empty-to-null text, strict date-only parsing, UUID validation, and safe integer cents. Implementations are duplicated and have minor runtime-defensiveness differences. Keep them explicit for now; extract only proven primitives after the current-Trader helper. Do not introduce a generic validation framework.

Review relation UUID arrays are deduplicated in the domain, repository, and database boundary. Ownership fields are absent from every Create/Update contract.

### Repositories, services, and actions

- Repositories use the authenticated caller client and preserve RLS; create uses `.single()`, owner-filtered lookup/update uses `.maybeSingle()`.
- Lists have deterministic primary ordering; Trade, Session, Objective, Review, and Setup add tie-break ordering. Account and Trade Error use only `created_at`, whose equal-value ordering is theoretically unspecified (LOW).
- No repository exposes delete; Review replacement uses only authenticated RPCs.
- Services authenticate, resolve Trader, validate, orchestrate repositories, and map errors without UI concerns.
- Actions are thin `"use server"` adapters over the server Supabase client and services. No business logic, ownership argument, delete, or service-role path exists.

## Financial integrity

1. JS `number` is safe for MVP cents only while every cent boundary enforces `Number.isSafeInteger`; Account and Trade now do so. PostgreSQL `bigint` can store values beyond JS safe precision, so repositories reject rather than round them.
2. `Number.isSafeInteger` is enforced for Trading Account initial/current cents and Trade P&L cents, including database mapping.
3. PostgreSQL `bigint` fields can exceed ±9,007,199,254,740,991. Prop Firm drawdown cents currently have no application slice. PostgreSQL `numeric(20,8)` prices and position sizes can also exceed or out-resolve IEEE-754 exact precision.
4. Read Models should return summed cents as decimal strings (or validated safe numbers only when a checked range is guaranteed). Avoid JS `bigint` in JSON contracts unless a serialization convention is explicitly adopted.
5. A decimal dependency is not needed now. Perform exact aggregation in PostgreSQL; introduce a decimal library only when application-side arithmetic on `numeric` values is required.

Negative realized P&L is correctly allowed. Risk is an integer constrained to 0–10,000 basis points in both domain and database. No persisted floating monetary amount exists.

## Historical data protection

Authenticated users cannot DELETE Traders, Accounts, Sessions, Setups, Trades, Trade Errors, Objectives, or Reviews. Junction rows can only be replaced inside owner-validated RPC transactions. All FKs restrict deletion.

Accepted limitation (MEDIUM): Trade correction and other source-record updates overwrite fields and `updated_at`; event/audit/version history is not implemented. This conflicts with the long-term ADR/Business Rules immutability ideal but is explicitly accepted for the current MVP correction workflow. Setup version history and archival workflows are likewise deferred.

## Test audit

- Unit/non-Supabase: 72 tests across nine files.
- Integration: seven suites, one per application slice; all execute Auth → service → repository → PostgreSQL → RLS using publishable/anon clients and authenticated user JWTs.
- E2E: one foundation-page smoke test.
- Live total: 79/79 Vitest tests passed.
- Security coverage: authentication denial, A/B isolation, ownership injection, foreign parents, update visibility, conflict mapping, and no-delete behavior.
- Review atomicity: valid replacement, duplicate IDs, empty sets, foreign Trade rollback, foreign Objective rollback, unauthenticated denial, and cross-user denial.

No tested user flow uses a service role or privileged database client. Synthetic users use randomized local-only identities. Suites do not depend on fixed IDs or execution order and can run independently. They leave synthetic local state until the disposable database is reset/stopped; this is acceptable isolation for local integration.

Meaningful gaps:

- No automated live catalog assertion persists the RLS/function privilege matrix; the audit checks it manually.
- No repository-mapper unit test injects out-of-range database bigint strings; service/input tests and live normal-range paths cover current behavior.
- No E2E authenticated CRUD journey exists; current security assurance is stronger at integration level.
- Prop Firm and Trader profile do not yet have application vertical slices because they were not part of the seven requested slices.

## Duplication and TypeScript

- MEDIUM: seven current-Trader helper copies; refactor before substantial read-service expansion.
- LOW: CRUD repositories, service persistence wrappers, action client adapters, validators, and integration bootstrap repeat explicit patterns.
- No HIGH duplication creates a current security bypass.

Repositories use `Record<string, unknown>` and casts because generated Supabase Database types are absent. This keeps storage mapping explicit but weakens compile-time column/nullability/RPC checks. Recommendation: introduce generated types NOW as the first Read Model foundation step, because the schema and migrations are stable and new aggregate views/RPCs would otherwise multiply casts. Keep explicit domain mapping rather than exposing generated row types upward.

## Toolchain

- Manifest pins Node `24.14.0` and pnpm `11.16.0`; lockfile and dependency versions are pinned.
- This audit ran successfully on Node `24.19.0` and pnpm `11.19.0`, producing engine warnings but no behavior failure.
- Recommendation: keep the declared pins until CI/runtime images are selected, then update all pins together. `Development.md` currently describes broader “24 or newer / 11 or newer” ranges and should be aligned with the chosen reproducibility policy. Severity LOW.

## Documentation and roadmap consistency

Implementation follows ADR-001 layering and source-of-truth rules. Security behavior and atomic Review replacement are documented. Statistics remain calculated and unimplemented as intended.

Outdated current-state statements exist in the technical spec, Development guide, and Product Backlog. They are LOW severity because authoritative migrations/tests are clear, but should be corrected when opening the Read Model phase. Product documents also contain aspirational immutability, Setup history, risk-alert, mandatory Review cadence, and controlled analytical concepts that are not Sprint 01 implementation commitments.

Sprint verdict: COMPLETE for the approved technical scope. Intentionally deferred: archival/audit history, controlled vocabularies, Prop Firm/Trader application workflows, richer UI, statistics/read models, automation, Psychology expansion, and Wealth. Read Models / Statistics are the next phase, not missing Sprint 01 scope.

## Read Model readiness

### Safe immediately

- Total Trade count.
- Total realized P&L as an exact PostgreSQL bigint/numeric aggregate over non-null `pnl_cents`, returned as a string unless range-checked.
- Average risk basis points.
- Counts/groupings by Setup, Session type, Asset, Trade Error category, and Review type.
- Review counts.

### Needs product definition

- “Closed Trade” (non-null exit price, non-null P&L, result value, or explicit future status).
- Win/loss and win rate (P&L sign versus uncontrolled `result` text; treatment of zero/breakeven/open trades).
- “Performance” by Setup/Session/Asset (P&L, return percentage, RR, or another measure).
- Active Objectives because `status` is free text.
- Average RR, profit factor, expectancy, drawdown, discipline score, and Phoenix Index formulas.
- Currency aggregation across Trading Accounts; cents from different currencies must never be summed without grouping/conversion policy.

### Recommended boundary

Use a mixed strategy:

```text
UI → server/application read service → read repository → PostgreSQL security-invoker views and authenticated RPCs
```

Use security-invoker PostgreSQL views for stable owner-scoped projections/groupings, and authenticated read RPCs for parameterized or multi-step aggregates that require explicit ownership and safe return types. Keep product definitions and response mapping in the application read service. Avoid loading all Trades for application-side aggregation; PostgreSQL should perform exact filtering/grouping/summing. Apply the same fixed-search-path, privilege, RLS, and safe-error standards used by `0004`.

## Severity register

### CRITICAL

None.

### HIGH

None unresolved. Unsafe Trading Account cent precision was corrected during this audit.

### MEDIUM

- Extract and test shared current-Trader resolution before substantial Read Model expansion.
- Define audit/version/correction history for mutable Trades and Setups before claiming historical immutability.
- Define metric semantics, status/result vocabularies, and multi-currency aggregation before analytical KPIs.
- Generate Supabase Database types at the start of the Read Model phase.

### LOW

- Align stale current-state documentation and toolchain version language.
- Consider stable secondary ordering for Account and Trade Error lists.
- Consolidate proven validation primitives and integration bootstrap only when expansion justifies it.
- Review or remove unused `domain/trading/types.ts` after Read Model contracts are established.
- Retire Account-named error aliases when imports can be migrated without compatibility risk.

## Open decisions and prioritized next actions

1. Approve exact definitions and currency policy for Statistics v1.
2. Generate typed Supabase database contracts and extract the shared current-Trader resolver.
3. Design owner-scoped security-invoker views plus authenticated aggregate RPCs.
4. Implement and live-test the smallest approved Statistics v1 read model.
5. Plan audit/version history separately; do not mix it into read-model delivery.

## Corrective changes made by this audit

- Replaced Trading Account integer validation with safe-integer validation.
- Added repository rejection of out-of-range PostgreSQL bigint values.
- Added a focused unsafe-cent unit assertion.
- Set Vitest `testTimeout` to 30 seconds so local Supabase suites pass through the documented `pnpm test` command.

No product feature, UI, Statistics, Wealth model, migration, or architecture redesign was added.
