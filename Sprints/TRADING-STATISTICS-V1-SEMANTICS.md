# Trading Statistics v1 — Semantics and Currency Policy

## Status

APPROVED FOR V1

This document is the authoritative semantic contract for Trading Statistics / Read Models v1. Implementations, SQL, RPCs, services, and UI labels must follow it. If an implementation cannot preserve these semantics, the metric must remain deferred.

## Scope and terminology

- **SOURCE DATA**: persisted Trading Core data. Statistics never mutate it.
- **DERIVED METRIC**: a read-only value calculated from source data under this contract.
- **FILTER**: a caller-selected restriction applied before aggregation.
- **DIMENSION**: an approved field used to group results.
- **UNRESOLVED PRODUCT DECISION**: an ambiguity that blocks a metric or behavior; no implementation may invent an answer.

Statistics v1 follows Process before performance, Discipline before profit, capital protection, no misleading aggregation, no hidden assumptions, and no UI-owned truth. Common trading-software conventions are not sufficient justification for a Phoenix metric.

## Source-of-truth assessment

The implemented `trades` table provides `trade_date`, owned Account/Setup/Session relationships, exact integer `pnl_cents`, free-text `result`, nullable `exit_price`, integer `risk_basis_points`, and exact persisted `asset`. Trading Account provides the only implemented currency field. Trade Error, Review, and Objective fields are also available, but their category/type/status values are free text.

`result` is descriptive SOURCE DATA, not an analytical classification. `exit_price` is optional and does not prove that an economic result is finalized. `pnl_cents` is the clearest implemented realization signal and is therefore authoritative for v1 closed/win/loss semantics.

## Canonical Trade-state semantics

### Closed Trade

A Trade is CLOSED exactly when:

```sql
pnl_cents is not null
```

No `result` text and no `exit_price` value can independently classify a Trade as closed.

### Unresolved Trade

A Trade is UNRESOLVED exactly when:

```sql
pnl_cents is null
```

The canonical contract name is `unresolvedTradeCount`. “Open Trade” may be explanatory UI copy, but it must not imply live broker-position state, which Phoenix does not currently store.

### Outcome classes

Only CLOSED Trades participate:

- WIN: `pnl_cents > 0`
- LOSS: `pnl_cents < 0`
- BREAKEVEN: `pnl_cents = 0`

An unresolved Trade is none of these. Free-text `result` is never used to calculate these classes.

### Win Rate

```text
winRate = winCount / (winCount + lossCount)
```

Breakeven and unresolved Trades are excluded from the denominator. When `winCount + lossCount = 0`, `winRate` is `null`, not zero.

The application contract is an unrounded decimal ratio as a finite `number | null`, with `0 <= winRate <= 1`. UI presentation may format the ratio as a percentage. Counts remain separately available.

Example: 10 wins, 5 losses, and 2 breakeven Trades produce `10 / 15 = 0.6666…`; the UI may display `66.67%`.

## Trading Statistics v1 Currency Policy

**APPROVED FOR V1**

- Source currency is the linked Trading Account’s `currency`.
- There is no FX conversion, exchange-rate service, historical normalization, or artificial base currency.
- Every monetary aggregate is grouped by currency.
- Cross-currency amounts are never added or compared as one money number.
- PostgreSQL performs exact monetary aggregation.
- Aggregate cents cross the application boundary as base-10 decimal strings.
- A future FX-normalized view requires a separate versioned product and architecture decision.

Conceptual contract:

```ts
type CurrencyPnl = {
  currency: string;
  pnlCents: string;
};
```

The string is an integer for sums and gross amounts. Averages may be exact decimal strings because an average of integer cents can contain a fractional cent.

### Current-schema currency limitation

Trade does not snapshot currency. Currency attribution therefore uses the Trading Account’s current persisted currency. Changing an Account currency reclassifies all linked historical Trade P&L. V1 treats currency edits on an Account with Trades as corrections to the source denomination, not routine conversion. Historical currency versioning is an UNRESOLVED PRODUCT DECISION and future schema concern; it does not authorize FX conversion.

### Account filtering

Statistics supports either all Accounts owned by the current Trader or one owned `tradingAccountId`.

- Non-monetary Trade metrics may combine Accounts.
- Monetary metrics remain separated by Account currency.
- Selecting all Accounts can return one or more currency groups.
- Selecting one Account normally returns at most one currency group.
- A caller-supplied Account ID is a filter only, never an ownership source.

## Canonical filters

```ts
type TradingStatisticsFilter = {
  from?: string;
  to?: string;
  tradingAccountId?: string;
};
```

- `from` and `to` are optional strict `YYYY-MM-DD` dates.
- The range is inclusive: `from <= trade_date <= to`.
- Missing `from` means no lower bound; missing `to` means no upper bound.
- If both exist, `to` must not precede `from`.
- `tradingAccountId`, when present, must be a valid UUID owned by the current Trader.
- Trade and Trade Error metrics use the parent Trade’s `trade_date` and Account.
- Review metrics use Review-period overlap: `period_start <= to` and `period_end >= from`, with missing bounds omitted. `latestReviewPeriodEnd` is the maximum `period_end` in that Review range.
- Objective metrics are Trader-wide in v1; Trade date and Account filters do not apply because Objective has neither relationship. Responses must make this scope clear.
- Account filtering does not alter Review metrics in v1 because Reviews have no canonical Account relationship.

Setup and Asset are dimensions, not Phase A filters. Additional filters require a contract revision.

## Approved base metrics

### Counts and realized outcomes

- `totalTradeCount`: count all owned Trades after Trade filters. Includes unresolved, wins, losses, and breakeven.
- `closedTradeCount`: count filtered Trades where `pnl_cents IS NOT NULL`.
- `unresolvedTradeCount`: count filtered Trades where `pnl_cents IS NULL`.
- `winCount`, `lossCount`, `breakevenCount`: filtered CLOSED Trade counts using P&L sign.
- `winRate`: canonical ratio defined above.

Invariant:

```text
totalTradeCount = closedTradeCount + unresolvedTradeCount
closedTradeCount = winCount + lossCount + breakevenCount
```

### Realized monetary metrics

All are calculated only from filtered CLOSED Trades and grouped by Trading Account currency.

- `realizedPnlCents`: `SUM(pnl_cents)`.
- `averagePnlCents`: `AVG(pnl_cents)`, returned as an exact decimal string.
- `grossProfitCents`: sum of positive `pnl_cents`; non-negative integer string.
- `grossLossCents`: sum of negative `pnl_cents`; non-positive integer string. Source sign is preserved. UI may separately display its absolute magnitude.

A currency group with CLOSED Trades is retained even if its realized sum is zero. If no CLOSED Trades exist, the monetary group array is empty.

### Average Risk

`averageRiskBasisPoints` is `AVG(risk_basis_points)` over all filtered Trades, including unresolved Trades. Risk is known at Trade creation and is a process/execution attribute, not a realized outcome.

The value is an exact decimal basis-point string or `null`; UI may convert 100 basis points to 1.00%. The database/read model does not return a formatted percentage.

### Trade Errors

- `tradeErrorCount`: count Trade Error records whose parent Trade matches Trade filters.
- `tradesWithErrorsCount`: count distinct filtered Trades having at least one Trade Error.
- `tradeErrorRate`: `tradesWithErrorsCount / totalTradeCount` as an unrounded finite ratio `number | null` in `[0,1]`.
- Error frequency breakdown: count Trade Error records grouped by exact persisted category and/or exact persisted severity.

Error rate never divides Error record count by Trade count. No severity weighting or error score exists; severity is free text and has no approved ordering.

### Reviews

Safe Review metrics are:

- `reviewCount`: count owned Reviews matching the Review-period overlap filter.
- count grouped by exact persisted `review_type`.
- `latestReviewPeriodEnd`: maximum matching `period_end`, or `null`.

No Review quality, completeness, cadence-compliance, or text-derived score is approved.

### Objectives

Safe Objective metrics are:

- `objectiveCount`: total owned Objectives.
- count grouped by exact persisted `status`.

`activeObjectiveCount`, completion rate, overdue count, and achievement rate are BLOCKED BY PRODUCT DEFINITION until an Objective status vocabulary and lifecycle are approved.

## Phase A — Trading Overview

The minimum first read model contains:

```ts
type TradingOverview = {
  totalTradeCount: number;
  closedTradeCount: number;
  unresolvedTradeCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number | null;
  averageRiskBasisPoints: string | null;
  realizedPnlByCurrency: Array<{
    currency: string;
    realizedPnlCents: string;
    averagePnlCents: string;
    grossProfitCents: string;
    grossLossCents: string;
  }>;
  tradeErrorCount: number;
  tradesWithErrorsCount: number;
  tradeErrorRate: number | null;
  reviewCount: number;
  objectiveCount: number;
};
```

PostgreSQL `count` values must be checked before conversion to JS numbers. Contracts must never contain an unsafe integer, `NaN`, or `Infinity`.

## Phase B — Breakdown read models

Every breakdown reuses the exact closed/outcome/rate/currency semantics above. No breakdown may redefine Win Rate.

### Setup Breakdown

Group by `setup_id`; expose the current Setup name as a label. Return total, closed, unresolved, win, loss, breakeven, win rate, currency-scoped realized P&L metrics, and average risk basis points. Ranking or “best Setup” is not approved; a future ranking requires a minimum sample-size policy. Setup names are mutable and not historically snapshotted.

### Session Type Breakdown

Group by the exact current persisted `sessions.session_type`. Return the same core metrics. Casing/spelling differences produce distinct groups; Statistics must not silently normalize history. Session type is mutable and free text.

### Asset Breakdown

Group by exact persisted `trades.asset`. `ES`, `es`, and `ES1!` are distinct. Return the same core metrics. Symbol normalization is deferred.

### Trade Error Breakdown

Return category frequency and severity distribution using exact persisted text. A combined category/severity grouping may be exposed, but no weighted score or implied severity order is allowed.

## Approved dimensions

- Trading Account
- Setup
- Session Type
- Asset
- Currency
- Trade Error Category
- Trade Error Severity
- Review Type
- Objective Status

No speculative dimension is approved for v1.

## Metric status matrix

| Metric | V1 Status | Definition Source | Currency Sensitive | Notes |
| --- | --- | --- | --- | --- |
| Total Trades | APPROVED | all filtered Trades | no | activity volume |
| Closed Trades | APPROVED | `pnl_cents IS NOT NULL` | no | realized signal |
| Open/Unresolved Trades | APPROVED | `pnl_cents IS NULL` | no | canonical name: unresolved |
| Wins | APPROVED | closed and `pnl_cents > 0` | no | ignores `result` |
| Losses | APPROVED | closed and `pnl_cents < 0` | no | ignores `result` |
| Breakeven | APPROVED | closed and `pnl_cents = 0` | no | excluded from Win Rate |
| Win Rate | APPROVED | wins / (wins + losses) | no | ratio; null at zero denominator |
| Realized P&L | APPROVED | sum closed `pnl_cents` | yes | group by Account currency; string |
| Average P&L | APPROVED | average closed `pnl_cents` | yes | exact decimal string |
| Gross Profit | APPROVED | sum positive closed P&L | yes | non-negative string |
| Gross Loss | APPROVED | sum negative closed P&L | yes | signed non-positive string |
| Average Risk | APPROVED | average `risk_basis_points` for all filtered Trades | no | includes unresolved; decimal string |
| Profit Factor | DEFERRED | requires gross profit / absolute gross loss | yes | zero-loss behavior not approved |
| RR / R-Multiple | DEFERRED | no persisted RR; geometry semantics unresolved | no | planned vs realized unresolved |
| Expectancy | DEFERRED | requires approved outcome/average/currency model | yes | not in initial v1 |
| Drawdown | DEFERRED | requires equity-flow and ordering policy | yes | Trade P&L alone insufficient |
| Risk Compliance | BLOCKED BY PRODUCT DEFINITION | no persisted approved risk limit | no | never assume 1%/2% |
| Error Frequency | APPROVED | count Errors by exact category/severity | no | no weights |
| Error Rate | APPROVED | distinct Trades with Errors / all Trades | no | null at zero Trades |
| Review Count | APPROVED | Review-period overlap | no | Trader-wide |
| Objective Count | APPROVED | all owned Objectives | no | Trader-wide |
| Active Objectives | BLOCKED BY PRODUCT DEFINITION | status is free text | no | approve lifecycle first |
| Discipline Score | DEFERRED | no approved formula | no | Phase C |
| Phoenix Score | DEFERRED | no approved formula | unresolved | Phase C |
| FX-normalized P&L | DEFERRED | no FX policy/source | yes | separate versioned decision |

## Explicitly deferred analytics

### Profit Factor

Deferred from initial Statistics v1. Although the numerator and denominator could be derived, behavior when gross loss is zero and multi-currency presentation must be separately approved. Implementations must never return `Infinity` or `NaN`.

### RR / R-Multiple

Deferred. Entry, stop, target, exit, and direction do not settle planned versus realized RR, zero stop distance, invalid geometry, target-at-entry, or correction semantics. A dedicated domain specification is required.

### Expectancy

Deferred. It requires an approved formula, treatment of breakeven, average gain/loss semantics, and currency or R normalization.

### Drawdown

Deferred. Trade P&L alone does not define account equity because starting balance, deposits, withdrawals, snapshots, ordering, Account partitioning, and currency all matter. No pseudo-drawdown is allowed.

### Risk Compliance

Blocked. Phoenix stores risk taken but no canonical permitted-risk target. Statistics must not invent a 1% or 2% threshold.

## Zero-state and output semantics

With no filtered Trades:

- counts are `0`;
- `winRate` is `null`;
- `averageRiskBasisPoints` is `null`;
- `realizedPnlByCurrency` is `[]`;
- `tradeErrorCount` and `tradesWithErrorsCount` are `0`;
- `tradeErrorRate` is `null`.

With no matching Reviews, `reviewCount` is `0` and `latestReviewPeriodEnd` is `null`. With no Objectives, `objectiveCount` is `0` and status groups are empty.

A zero denominator always produces `null`, never `0%`, `NaN`, or `Infinity`.

### Rounding and transport

- Counts: checked safe JS integers.
- Money sums/gross amounts: exact integer decimal strings.
- Money averages and basis-point averages: exact PostgreSQL decimal strings.
- Rates: unrounded finite decimal ratios as JS numbers or `null`.
- UI: owns localized currency formatting, percentage formatting, and presentation rounding.
- Database/read services: never round source aggregates merely for display.

## Read Model architecture decision

**APPROVED: mixed PostgreSQL read boundary.**

```text
UI
  → Server Action / Server Component
  → Trading Statistics Read Service
  → Read Repository
  → authenticated security-invoker SQL view and/or aggregate RPC
  → PostgreSQL + RLS
```

- Use PostgreSQL security-invoker views for reusable owner-filtered row projections and dimensions.
- Use authenticated RPCs for parameterized or complex aggregate response shapes.
- PostgreSQL performs filtering, grouping, counting, and exact numeric aggregation.
- Read repositories map database transport to safe application contracts.
- Read services validate filters, preserve error safety, and enforce this semantic contract.
- Server boundaries adapt for UI; UI never calculates authoritative KPIs.
- Application-side aggregation of full Trade datasets is rejected for v1 because it is less exact, less scalable, and easier to diverge semantically.

## Security boundary

Statistics are private Trader data. Every view/RPC must preserve:

```text
auth.uid() → traders.auth_user_id → current Trader → owner-only rows → aggregate
```

- No service role is required.
- No caller-supplied `trader_id` is trusted.
- Account filters must be owner-validated.
- Aggregation must occur only after tenant filtering; no cross-tenant intermediate or result is permitted.
- Security-invoker views must inherit underlying RLS.
- Any SECURITY DEFINER aggregate RPC must justify that mode, use a fixed empty `search_path`, fully qualify objects, revoke PUBLIC/anon execution, grant only `authenticated`, and derive ownership from `auth.uid()`.
- Database failures map to safe application errors; no raw database detail reaches UI callers.

## Phasing

### Phase A — Overview

Implement the canonical `TradingOverview` only.

### Phase B — Breakdowns

Implement Setup, Session Type, Asset, and Trade Error breakdowns using identical canonical metrics.

### Phase C — Advanced analytics

Deferred: Profit Factor, RR, Expectancy, Drawdown, risk compliance, Discipline Score, Phoenix Score, and FX-normalized P&L.

## Open product decisions

- Controlled Trade `result` vocabulary and whether it remains descriptive only.
- Objective status vocabulary and lifecycle.
- Session type vocabulary.
- Setup versioning and historical label policy.
- Asset identifier normalization.
- Trade Error category and severity taxonomy.
- Profit Factor zero-loss behavior.
- Planned and realized RR rules.
- Expectancy definition.
- Drawdown/equity-flow model.
- Base-currency and historical FX conversion policy.
- Cross-Account performance comparison and ranking policy.
- Minimum sample sizes for rankings.
- Historical currency behavior when an Account currency is corrected.
- Review cadence/compliance semantics.

## Acceptance criteria

This contract is approved because:

- every included v1 metric has one deterministic definition;
- P&L cannot be combined across currencies;
- closed/win/loss/breakeven semantics derive only from `pnl_cents`;
- all zero-denominator outcomes are defined;
- rate representation and rounding ownership are defined;
- exact monetary transport uses strings;
- filters, their applicability, and dimensions are explicit;
- ambiguous advanced metrics are deferred or blocked;
- owner-only security is mandatory before aggregation; and
- the implementation boundary is approved without implementing Statistics in this task.
