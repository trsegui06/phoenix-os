# Phoenix OS — Public MVP Release Readiness Audit

**Audit date:** 2026-08-18  
**Audited commit:** `cff35a1 feat: add public registration and password recovery`  
**Branch:** `main`  
**Release verdict:** **B — CONDITIONALLY READY, RELEASE BLOCKED**

## Executive decision

The application code is a credible controlled-beta candidate: the frozen install, production build, unit/integration suite, browser journeys, clean migration replay, tenant isolation catalog checks, and dependency vulnerability audit pass. No CRITICAL correctness or data-isolation defect was found.

Phoenix OS must not yet be opened to real public users. There is no evidenced production web target or Supabase project, no production SMTP and confirmation-email validation, no CI gate, no exception/uptime monitoring, no backup/restore proof, and no minimum privacy/terms/support package. These are release-system gaps, not a reason to add product features. Maintain feature freeze until every HIGH blocker below has objective evidence.

## Scope and authority

The audit reconciled the accepted architecture, prior closing audits, onboarding/public-auth specifications, Trading feature specifications, and `docs/Development.md`, `PRD.md`, `ProductBacklog.md`, `BusinessRules.md`, and `DataModel.md` against the implementation. Older product documents still describe a personal/operator-oriented product and stale planned statuses; the implementation and recent sprint closure documents are authoritative for current runtime behavior.

## Evidence collected

| Gate | Result | Evidence |
| --- | --- | --- |
| Repository state | PASS | Clean `main`; `origin` is `https://github.com/trsegui06/phoenix-os.git`; local HEAD equals audited remote HEAD at start |
| Frozen install | PASS WITH WARNING | `pnpm install --frozen-lockfile`; lockfile unchanged; exact engine mismatch warning (Node 24.19.0 vs 24.14.0, pnpm 11.19.0 vs 11.16.0) |
| Production dependency audit | PASS | `pnpm audit --prod`: no known vulnerabilities |
| Formatting | PASS | `pnpm format:check` after removal of ignored Supabase runtime artifacts |
| Lint | PASS | `pnpm lint` |
| Type safety | PASS | `pnpm typecheck` |
| Automated tests | PASS | 30 files, 171/171 tests |
| Browser tests | PASS | Playwright Chromium, 10/10 journeys, including onboarding, trade entry, logout, recovery email and password replacement |
| Production build | PASS | Next.js 16.3.0 optimized build; all routes compiled |
| Migration replay | PASS | Local database destroyed/recreated; migrations `0001`–`0007` applied in order without seed |
| RLS catalog | PASS | RLS enabled on all 11 public tables |
| Privileged RPC catalog | PASS | Nine `SECURITY DEFINER` functions have empty `search_path`; `anon`/`PUBLIC` execute denied; `authenticated` execute granted |
| Docker/local infrastructure | PASS | Docker CLI/Engine 29.7.2 accessible; local Supabase healthy and stopped without backup after testing |
| Secret hygiene | PASS | No tracked env/secret/runtime artifact found; `.env*` ignored except `.env.example`; service-role workflow absent |
| CI | FAIL | No `.github/workflows` directory or other CI definition |
| GitHub release controls | NOT PROVEN | Public repository and default `main` confirmed through GitHub connector; branch protection/status checks and release history could not be evidenced by available connector; `gh` is unavailable locally |

The initial format/lint attempt included ignored files generated under `supabase/.temp` and failed on those third-party artifacts. After the local stack was stopped and only that ignored directory removed, both source-tree gates passed. This exposes a CI hygiene requirement: generated runtime directories must be excluded or created after static analysis.

## Production architecture assessment

The implemented shape remains aligned with ADR-001: Next.js/React/TypeScript, server-side orchestration, Supabase Auth/PostgreSQL, versioned migrations, RLS, Vitest, and Playwright. The browser receives only the Supabase project URL and publishable key. No direct database connection or service-role key is required by the Next.js build or runtime.

No hosting provider is selected or configured. There is no `vercel.json`, Dockerfile, deployment workflow, environment definition, preview/staging convention, or production runbook. Provider selection is not a feature decision, but it is a release prerequisite.

## Environment and secrets matrix

| Variable | Build | Runtime | Browser-visible | Local | Preview | Production | Rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Required for usable auth build/runtime | Required | Yes | Local API URL | Dedicated non-prod project URL | Production project URL | Never point preview at production |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required for usable auth build/runtime | Required | Yes, intentionally public | Local publishable key | Non-prod publishable key | Production publishable key | Never use service-role/secret key |
| `NEXT_PUBLIC_SITE_URL` | Required for deterministic callback links | Required | Yes | `http://127.0.0.1:3000` | Exact HTTPS preview origin if callbacks are tested | Canonical HTTPS origin | No wildcard or user-controlled origin |

Secrets must live only in the deployment provider and Supabase dashboards, scoped per environment and accessible to the minimum number of operators. Production SMTP credentials, database credentials, management tokens, service-role keys, and monitoring tokens must never be prefixed `NEXT_PUBLIC_`, committed, logged, or supplied to browser code. Record owner, creation date, rotation procedure, and revocation path without recording values.

## Supabase production readiness

Local behavior is strong, but no linked/hosted production project was inspected or mutated during this audit. Before release, an accountable operator must create separate preview and production projects, verify PostgreSQL major compatibility with local `major_version = 17`, apply migrations only through an approved release job/operator, and capture the remote migration ledger.

Production Auth must use:

- the exact canonical HTTPS Site URL and exact `/auth/callback` allow-list;
- email confirmation enabled for public registration;
- a verified custom SMTP sender/domain with bounce and complaint visibility;
- a password policy stronger than the local six-character minimum (minimum 8, preferably 12, plus provider breached-password protection if available);
- secure password change/reauthentication where supported;
- provider rate limits reviewed for the beta size;
- CAPTCHA/Turnstile enabled before broad acquisition, or earlier if abuse is observed.

The callback implementation does not accept arbitrary return URLs. It builds redirects from `NEXT_PUBLIC_SITE_URL`, enforces HTTPS outside localhost, uses a fixed callback path, exchanges a single-use code, and protects password recovery with a constant-time state comparison and short-lived HTTP-only authorization cookie. Local confirmation-disabled behavior is not sufficient evidence for production confirmation-enabled behavior; run that journey live in preview before production.

All 11 public tables have RLS. All nine privileged functions derive identity from `auth.uid()`, use an empty search path, and deny execution to `anon` and `PUBLIC`. Catalog inspection also shows broad default table privileges such as `TRUNCATE`, `TRIGGER`, and `REFERENCES` for Data API roles. They are not exposed as current application operations, but they violate least-privilege intent and must be explicitly revoked and regression-tested before public release (HIGH).

## Backup, restore, and migration control

Production release requires an evidenced backup policy, not an assumption about a provider plan:

- identify the person accountable for database migrations and recovery;
- document backup frequency, retention, encryption, and plan limits;
- export or snapshot immediately before each schema release where supported;
- perform a restore drill into a non-production project and record recovery time/data-loss results;
- retain the exact deployed commit and migration ledger;
- never use `db reset`, `--local` assumptions, destructive SQL, or an unreviewed dashboard change against production;
- prefer forward-fix migrations; prepare an explicit rollback/containment decision for each release because destructive schema rollback may lose data.

Release order: freeze and tag candidate → green CI → backup/snapshot → apply migrations `0001`–`0007` in order to preview → preview smoke/E2E → apply the identical migration set to production → deploy web artifact with production env → smoke test → monitor → announce beta. If migration or auth smoke fails, stop traffic/deployment promotion; restore only under the rehearsed recovery procedure.

## Application security review

Positive findings:

- server-side route protection and Supabase session refresh;
- owner-scoped RLS and owned-parent validation;
- atomic trade/error writes;
- exact money/risk parsing and SQL parameterization through Supabase clients/RPCs;
- no `dangerouslySetInnerHTML` or raw dynamic SQL found;
- recovery state binding and fixed trusted redirect origin;
- HTTP-only, SameSite=Lax, Secure-in-production recovery authorization cookie;
- no service-role/admin Auth workflow.

Required hardening:

- add explicit security response headers: CSP, `frame-ancestors`/X-Frame-Options, `X-Content-Type-Options`, Referrer-Policy, and an appropriate Permissions-Policy (MEDIUM before beta, HIGH before broad release);
- explicitly revoke unused table privileges from `anon` and `authenticated`, especially `TRUNCATE`/`TRIGGER`/`REFERENCES`, and add catalog assertions (HIGH);
- enable production confirmation, SMTP, stronger password policy, and abuse controls (HIGH);
- document CSRF assumptions for server actions and retain SameSite cookie behavior; do not introduce cross-origin mutation endpoints without explicit origin/token controls (MEDIUM);
- add automated secret scanning and dependency audit in CI (HIGH as part of missing CI).

## Reliability, observability, and operations

There is no production error tracker, structured application logging policy, uptime check, alert route, dashboard, incident owner, status communication channel, or incident runbook. A controlled beta requires at minimum:

- client/server exception capture with release identifier and redaction rules;
- external HTTPS uptime check for `/login` and a safe authenticated synthetic check or manual schedule;
- Supabase availability/auth/database alert visibility;
- alerts delivered to a named human, with acknowledgement and escalation;
- deploy annotation and rollback/disable-registration procedure;
- log prohibition for passwords, tokens, email-link codes, cookies, financial notes, and secret values;
- incident severity definitions, contact route, containment checklist, and post-incident record.

## Performance and growth

The production build succeeds and current beta volume is compatible with server-rendered Next.js and managed PostgreSQL. Supabase API response size is capped locally at 1,000 rows. Current dashboard aggregation performs multiple RPC round trips; this is acceptable for a very small beta but must be timed in preview and monitored. Entity list repositories do not show an explicit application pagination contract. Before data grows, introduce bounded pagination/cursors for user-managed lists and establish query latency/error-rate thresholds. Run a preview smoke dataset representative of at least one year of active trading before general release.

## Legal, privacy, and user operations

The repository contains no public Privacy Notice, Terms/acceptable-use notice, support contact, account deletion flow/runbook, retention schedule, or data export/correction procedure. Phoenix OS stores identity and user-entered financial/trading information. Before inviting real users, publish a minimum plain-language notice stating controller/contact, data collected, purpose, processors/categories, retention, security/contact channel, and user-request route; publish basic terms and risk/non-advice disclaimer; define a support mailbox; and document manual account/data deletion and export handling. Obtain qualified legal review appropriate to the launch jurisdictions; this audit is not legal advice.

## Release blocker matrix

| ID | Severity | Blocker | Owner | Exit evidence |
| --- | --- | --- | --- | --- |
| B-01 | HIGH | No production web target, canonical domain, HTTPS or environment separation | Release owner | Deployed preview/prod projects, verified TLS/domain, env matrix screenshots/record |
| B-02 | HIGH | No production Supabase project/configuration or remote migration proof | Database owner | Separate projects, PostgreSQL version check, migration ledger, RLS/RPC catalog report |
| B-03 | HIGH | Production email confirmation/SMTP/deliverability unvalidated | Auth owner | Verified domain/sender, confirmation and recovery inbox tests, bounce/complaint visibility |
| B-04 | HIGH | No CI gate or proven protected-main/status-check policy | Repository owner | Required PR checks on frozen install, format, lint, typecheck, tests, build, audit; protection evidence |
| B-05 | HIGH | No exception monitoring, uptime alerting or incident route | Operations owner | Test exception and failed uptime probe received/acknowledged; runbook linked |
| B-06 | HIGH | No backup policy or successful restore drill | Database owner | Timestamped non-prod restore drill with RPO/RTO and named owner |
| B-07 | HIGH | Privacy/terms/support/data-rights minimum absent | Product/legal owner | Published notices, support route, deletion/export runbook and jurisdiction review |
| B-08 | HIGH | Excess Data API role table privileges not explicitly revoked | Database/security owner | Migration revokes unused privileges; live catalog and regression tests pass |
| B-09 | MEDIUM | Security response headers absent | Web/security owner | Automated header assertions against deployed HTTPS app |
| B-10 | MEDIUM | CAPTCHA disabled and abuse thresholds untested | Auth/operations owner | Beta thresholds documented; CAPTCHA enabled or risk acceptance with trigger/owner |
| B-11 | MEDIUM | Exact Node/pnpm versions declared but not enforced by audited runtime | Repository owner | CI runs exact versions and fails engine mismatch; Corepack/toolchain documented |
| B-12 | MEDIUM | Pagination/load envelope and dashboard latency unmeasured | Application owner | Representative preview load smoke and thresholds recorded |

## Readiness score

| Area | Score |
| --- | ---: |
| Product/runtime correctness | 18/20 |
| Database security/integrity | 15/20 |
| Build/reproducibility/CI | 8/15 |
| Deployment/environment | 2/15 |
| Auth/email/abuse | 6/10 |
| Observability/recovery | 1/10 |
| Legal/support/user operations | 0/10 |
| **Total** | **50/100** |

The score is directional; blocker severity, not arithmetic, controls the release decision.

## Sequenced path to controlled beta

1. **Feature freeze now.** Permit only release infrastructure, security hardening, documentation, and blocker fixes.
2. Add CI and protected-branch evidence; enforce exact Node/pnpm and ignore generated runtime artifacts.
3. Select web hosting, domain, preview/prod environment ownership, and secret stores.
4. Create isolated Supabase preview/prod projects; add least-privilege migration and validate catalog/migrations in preview.
5. Configure production Auth, confirmation, SMTP, stronger passwords, redirect allow-list and abuse policy; validate real mailbox flows in preview.
6. Establish backup policy and complete restore drill.
7. Add monitoring, uptime checks, redaction policy and incident response.
8. Publish minimum privacy/terms/support/data-operation materials.
9. Run the release checklist in `docs/RELEASE-CHECKLIST.md`; capture evidence and obtain named go/no-go sign-off.
10. Invite a small allow-listed cohort, monitor closely, and keep registration disablement as the immediate kill switch.

## Final verdict

**B — CONDITIONALLY READY, RELEASE BLOCKED.** The software candidate is locally validated and has no known CRITICAL defect, but the operational and production controls required to protect first real users are not yet present or evidenced. Do not deploy publicly until B-01 through B-08 are closed. No feature work is required to change this verdict; a focused release-hardening iteration is required.
