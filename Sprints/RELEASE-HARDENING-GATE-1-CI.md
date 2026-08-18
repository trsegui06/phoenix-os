# Phoenix OS — Release Hardening Gate 1: CI & Repository Controls

**Baseline:** `114e270 docs: audit public MVP release readiness`

**Scope:** B-04 CI/release controls and B-11 toolchain enforcement only

**Feature freeze:** Active

**Gate result:** **PARTIALLY CLOSED** — remote run [Phoenix Release Gates #32084930631](https://github.com/trsegui06/phoenix-os/actions/runs/32084930631) passed all five checks on commit `4c07d2b`; `main` remains unprotected.

## CI architecture

`Phoenix Release Gates` runs for every pull request and every push to `main`. It has explicit `contents: read` permissions, no deployment capability, no production secrets, bounded job timeouts, and branch-aware concurrency: obsolete non-main runs are cancelled while active `main` validation is retained.

The five stable checks are deliberately suitable for required-status configuration:

| Check | Responsibility | Timeout |
| --- | --- | ---: |
| `Quality` | Frozen install, formatting, lint and TypeScript | 15 min |
| `Unit Tests` | Unit-compatible Vitest run without live environment variables | 15 min |
| `Supabase Integration` | Local stack, clean migration replay, live suite and generated type stability | 30 min |
| `E2E` | Chromium, local Auth/Mailpit and all browser journeys | 35 min |
| `Build & Security` | Full-history secret scan, HIGH/CRITICAL production dependency audit and production build | 20 min |

All actions are pinned to immutable commit SHAs. Only the pnpm store is cached through `setup-node`; env files, database volumes, browser auth state, Supabase runtime state, build output and test artifacts are not cached.

## Exact toolchain

The repository decision is to enforce the existing declarations rather than normalize them to the audit machine:

- Node `24.14.0`;
- pnpm `11.16.0` from `packageManager`;
- `pnpm install --frozen-lockfile` in every job.

Each job prints versions and uses shell assertions that fail on any mismatch. The local audit runtime may still warn when it differs; GitHub CI is the enforcement boundary.

## Local Supabase strategy

GitHub-hosted Ubuntu runners provide Docker, so the project-pinned Supabase CLI can run the same disposable stack as local development. Because the Windows-only migration junction is ignored by Git, CI creates a relative Linux symlink to the single migration source `database/migrations`.

`Supabase Integration` starts locally, applies migrations, performs a destructive reset against the local target only, and reapplies migrations `0001`–`0007` without seed data. Runtime URL and anonymous keys are parsed from `supabase status` inside the step and passed only to the test process. Existing integration tests then cover Auth, onboarding, Accounts, Sessions, Setups, Trades, Trade Errors, Objectives, Reviews and atomicity, Statistics A/B, Trade Entry and Public Auth. The stack is stopped in an `always()` cleanup step.

No workflow invokes `supabase link`, remote `db push`, remote reset, real SMTP, or a production credential.

## Generated types

After live integration, CI runs `pnpm db:types` against the local schema and then `git diff --exit-code -- lib/supabase/database.types.ts`. A schema change with stale checked-in types therefore fails without committing generated output.

## E2E and artifacts

CI installs Chromium and its Linux system dependencies, starts local Supabase including Mailpit, and runs the ten current browser journeys. One CI retry is allowed; tracing begins on the retry to distinguish infrastructure flake from deterministic failure. HTML reports and test results are uploaded only after failure, retained for seven days, and contain only disposable local-system activity.

## Security and supply chain

`Build & Security` checks out complete history and runs Gitleaks v3 pinned by SHA. The default GitHub token is provided only to that pinned scanner and workflow permissions remain read-only. `pnpm audit --prod --audit-level high` blocks known HIGH or CRITICAL production advisories without turning informational findings into an automatic release failure. Build variables are synthetic localhost values; no service-role or database secret is required.

Generated runtime paths are already ignored. `supabase/.temp` is additionally excluded from Prettier and ESLint so a local Supabase run cannot poison later static gates.

## Branch protection recommendation

Configure a GitHub ruleset for `main` to:

- require a pull request and at least one approving review;
- require `Quality`, `Unit Tests`, `Supabase Integration`, `E2E`, and `Build & Security` to pass on an up-to-date branch;
- block force pushes and branch deletion;
- restrict direct pushes/bypass to named emergency administrators, with audit trail;
- require conversation resolution and prevent bypass under normal release operation.

These settings are not changed by this gate. The GitHub branch API returned `protected: false`, protection disabled, and no required status checks for `main`; direct pushes are therefore not prevented by repository controls. Even after the remote workflow is green, B-04 is **PARTIALLY CLOSED**, not closed, until protection is enabled and evidenced.

## Local validation requirement

Before publication, run frozen install, format/write and format check, lint, typecheck, unit/live tests, clean migration replay, database type regeneration with no diff, E2E, production build and production dependency audit. After publication, the actual GitHub Actions run—not merely YAML syntax—must prove all five checks green.

## Release blocker update

| Blocker | Previous | Gate result condition |
| --- | --- | --- |
| B-04 — CI/release controls | OPEN / HIGH | PARTIALLY CLOSED when the remote workflow is green; CLOSED only when branch/ruleset protection is also enabled and evidenced |
| B-11 — exact toolchain | OPEN / MEDIUM | CLOSED when the remote jobs prove exact Node/pnpm assertions |

Feature freeze remains active. Gate 2 remains database privilege hardening and is intentionally untouched here.
