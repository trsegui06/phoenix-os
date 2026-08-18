# Phoenix OS — Release Hardening Gate 3: Hosting and Environments

**Baseline:** `e295c01 docs: close database privilege hardening gate`

**Scope:** B-01 hosting, domain, HTTPS, and environment separation architecture

**Feature freeze:** Active

**Gate result:** **PENDING REMOTE CI / PARTIALLY CLOSED** — repository architecture and runtime origin safeguards are implemented, but no preview deployment, owned canonical domain, HTTPS endpoint, or hosted environment separation has been provisioned.

## B-01 baseline

The repository contained no `vercel.json`, Dockerfile, deployment workflow, hosting project metadata, domain decision, hosted environment definitions, or deployment runbook. CI was local-validation-only and correctly held no production credentials. Local Supabase, Mailpit, localhost Auth URLs, versioned migrations, and green release gates were the only deployment-adjacent evidence.

## Hosting decision

Vercel is selected as the recommended controlled-beta web target after reviewing Vercel and self-hosted Node/container deployment. Both support all required Next.js features. Vercel wins for native Next.js compatibility, isolated previews, environment scopes, managed HTTPS/domains, Git SHA attribution, logs, promotion, and instant application rollback with substantially lower operational burden.

Self-hosting remains a contingency when exact runtime-patch or infrastructure control outweighs the additional responsibility for TLS/reverse proxy, images, patching, process draining, scaling, cache coordination, Server Action encryption keys, and skew protection. Static export is not viable.

No `vercel.json` was added because no repository-level override is currently necessary. Production auto-promotion is explicitly disabled in the target operating model until `main` is protected; staged builds require manual Release Owner promotion.

## Architecture and safeguards

`docs/DEPLOYMENT.md` defines `phoenix-local`, `phoenix-preview`, and `phoenix-production`, distinct web origins, distinct Supabase projects/Auth populations/keys/databases/migration ledgers, synthetic-only preview data, exact Auth callback origins, DB-first forward migration promotion, ownership, smoke tests, and rollback.

Runtime validation now:

- requires Supabase URL and publishable key as a pair;
- rejects credentials, paths, query strings, and fragments in configured origins;
- rejects local or non-HTTPS Supabase origins in production;
- requires an explicit non-local HTTPS Site URL in production;
- preserves HTTP only for localhost development.

The CI production build uses non-secret HTTPS placeholders so these production invariants are exercised without remote access. Project IDs remain outside Git; Vercel Preview/Production scoping and operator target verification prevent preview/production cross-wiring.

## Toolchain and cost constraints

Vercel supports Node `24.x`, not an exact patch; its current patch advances automatically. Phoenix CI continues to enforce Node `24.14.0`, while deployment evidence must record and validate the actual Vercel 24.x version. Corepack plus `packageManager` is the selected pnpm `11.16.0` mechanism. Plan selection remains an operator decision: stable custom environments, preview protection, log retention, bandwidth/functions, team controls, and two Supabase projects may incur cost.

## Proof obtained

- clean synchronized Gate 2 baseline;
- complete repository/redirect/cookie/deployment audit;
- official Vercel, Supabase, and installed Next.js documentation review;
- environment validation unit tests;
- local Supabase functional and browser regression;
- production build and dependency audit;
- remote GitHub five-gate result to be recorded after push.

## Proof still missing / operator decisions

- Vercel project and preview deployment;
- owned production and stable staging domains;
- observed TLS certificates and HTTPS routes;
- separately scoped Vercel Preview/Production variables;
- separate hosted preview and production Supabase projects;
- remote PostgreSQL version, migration ledger, RLS/RPC catalog, backup, and restore proof;
- production-like confirmation/recovery SMTP and deliverability;
- preview and production smoke evidence;
- named Release, Database, and Auth/Email owners;
- plan/budget selection and protected-main enforcement.

## Blocker classification

| Blocker | Previous | Current |
| --- | --- | --- |
| B-01 | OPEN / HIGH | PARTIALLY CLOSED — architecture and code safeguards complete; infrastructure proof absent |
| B-02 | OPEN / HIGH | OPEN — no hosted Supabase projects or remote migration/catalog evidence |
| B-03 | OPEN / HIGH | OPEN — no production-like SMTP/confirmation evidence |
| B-04 | PARTIALLY CLOSED | PARTIALLY CLOSED — CI green; `main` remains unprotected |

B-01 cannot be called closed until a preview is deployed, domain/TLS and scoped variables are evidenced, and no preview-to-production Supabase cross-wiring is proven. No remote platform or database was created or mutated in this gate.

