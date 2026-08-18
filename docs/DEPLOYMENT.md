# Phoenix OS deployment architecture

## Decision and current status

Vercel is the recommended web host for the controlled public beta. It is the lowest-operational-burden fit for the repository's Next.js 16 App Router, Server Components, Server Actions, Proxy, dynamic route handlers, and Supabase SSR cookies. Vercel supplies isolated Preview and Production environments, Git commit attribution, managed HTTPS/custom domains, logs, promotion, and deployment rollback.

A self-hosted Node/container target remains viable and supports all Next.js features, but it would make Phoenix responsible for image construction, reverse proxy/TLS, draining, patching, logs, scaling, cache coordination, Server Action encryption-key consistency, and version-skew controls. That burden is not justified for beta. Static hosting is incompatible with the server-side runtime.

No Vercel project, hosted Supabase project, domain, or remote deployment is proven by this repository. No `vercel.json` is required: framework detection and default build behavior are sufficient. Provisioning is an explicit operator task.

Authoritative references: [Next.js deployment options](https://nextjs.org/docs/app/getting-started/deploying), [Vercel environments](https://vercel.com/docs/deployments/environments), [Vercel Git deployments](https://vercel.com/docs/git), [Vercel promotion](https://vercel.com/docs/deployments/promoting-a-deployment), and [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Environment model

| Environment | Name | Web | Supabase | Data and email |
| --- | --- | --- | --- | --- |
| Local | `phoenix-local` | `http://127.0.0.1:3000` | Supabase CLI only | Disposable DB, synthetic users, Mailpit; HTTP permitted only here |
| Preview | `phoenix-preview` | Stable HTTPS staging origin plus ephemeral PR previews | Dedicated non-production project | Synthetic-only data; confirmation/recovery through controlled test SMTP |
| Production | `phoenix-production` | Manually promoted Vercel deployment at canonical HTTPS origin | Dedicated production project | Real users/data, real SMTP, backup and monitoring controls |

Isolation is absolute: local, preview, and production must use distinct databases, Auth users, publishable keys, email configuration, and migration ledgers. Preview must never contain a production Supabase URL or copied personal/trading data. Production must never use preview or local values. The runtime rejects incomplete Supabase configuration and rejects local/non-HTTPS origins when `NODE_ENV=production`; preview-versus-production project identity remains an operator-side Vercel scope check because project IDs are intentionally not committed.

## Domains, HTTPS, and Auth routing

Domain ownership is not yet evidenced. The Release Owner must select and record:

- production: `app.<owned-domain>`;
- stable Auth staging: `staging.<owned-domain>`;
- marketing root: separate if desired.

`NEXT_PUBLIC_SITE_URL` is always the exact origin: local `http://127.0.0.1:3000`, stable preview `https://staging.<owned-domain>`, or production `https://app.<owned-domain>`. It must contain no path, query, fragment, or credentials. Production fails closed if it is absent, local, or non-HTTPS. Supabase Site URL and the exact `/auth/callback` allow-list entry must match that environment.

Full signup and recovery validation runs on the stable staging origin. Ephemeral Vercel previews are useful for non-Auth review but must not cause Phoenix to derive redirects from request headers or arbitrary `VERCEL_URL` values. Supabase supports preview wildcards, but Phoenix does not enable a wildcard for production. If a preview wildcard is later accepted, scope it to the exact Vercel team suffix and `/auth/callback` after a security review.

HTTPS is mandatory outside local development. Supabase session cookies inherit the SSR library's production behavior. Phoenix recovery cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, and expire after ten minutes. These settings must not be relaxed for previews.

## Environment variables

All three values are intentionally browser-visible and are inlined by Next.js at build time. They must also be present for the deployed runtime. A deployment built for one environment must not be promoted with another environment's compiled public values; Vercel promotion must rebuild with the target environment variables or use a staged Production build.

| Variable | Local | Preview | Production | Public/secret | Owner | Rotation |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | CLI API origin | Preview project HTTPS origin | Production project HTTPS origin | Public | Database Owner | With project replacement |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | CLI publishable key | Preview publishable key | Production publishable key | Public | Database Owner | Rotate in Supabase, update the matching Vercel scope, redeploy, then revoke old key |
| `NEXT_PUBLIC_SITE_URL` | Local origin | Stable staging HTTPS origin | Canonical HTTPS origin | Public | Release Owner | Change with coordinated domain/Auth allow-list update and redeploy |

No service-role key or database password is required by the application. Future SMTP, management, monitoring, or database credentials belong only in the relevant Supabase/Vercel secret stores, without `NEXT_PUBLIC_`, with least-privilege operator access. Never place them in `.env.example`, GitHub plaintext, browser code, build logs, or tickets. Record owner, creation date, scope, rotation, and revocation without recording values.

Vercel must scope each variable separately to Preview and Production. Environment updates affect only new deployments; rotate by keeping the old credential valid until the replacement deployment passes smoke tests.

## Hosting and toolchain configuration

- Framework preset: Next.js; repository root: project root.
- Install: platform auto-install with Corepack enabled (`ENABLE_EXPERIMENTAL_COREPACK=1`) so `packageManager: pnpm@11.16.0` is honored; frozen-lockfile behavior must be visible in build logs.
- Build: `pnpm build` after dependency installation.
- Node: select Vercel `24.x` and record `node --version` in build evidence.
- pnpm: `11.16.0`, pinned by `packageManager` and verified in build evidence.

Vercel supports only Node majors and automatically advances minor/patch versions; it cannot guarantee repository/CI patch `24.14.0`. CI remains pinned to `24.14.0`, while every Vercel release must prove compatibility with the actual current `24.x` in its logs. This is an accepted platform constraint, not evidence of exact patch parity.

Plan assumptions must be checked before provisioning. A stable custom staging environment may be implemented with a persistent preview branch/domain or with Vercel Custom Environments (Pro/Enterprise). Confirm custom domains, preview protection, log retention, function/bandwidth limits, team access, and spend alerts. Two hosted Supabase projects may also require paid capacity. Do not assume an unlimited free tier.

## Deployment and promotion

GitHub Actions remains validation-only and holds no deployment or remote database credentials. Vercel Git integration may create automatic PR preview deployments. Because `main` is currently unprotected (B-04 partially open), pushes to `main` must create staged Production builds without automatically assigning the canonical domain. The Release Owner manually promotes only after all five GitHub checks and required preview evidence pass. Enable branch protection before considering automatic production promotion.

Forward-only release sequence:

1. Freeze a candidate SHA; pass Quality, Unit Tests, Supabase Integration, E2E, and Build & Security.
2. Verify target project identity, PostgreSQL major compatibility with local major 17, environment-variable scopes, Auth Site URL, and redirect allow-list.
3. Apply reviewed migrations to preview; never reset, squash, use dashboard SQL, or use a production link from CI.
4. Run preview smoke tests and inspect logs.
5. Database Owner confirms production backup/restore readiness and the exact linked project identity.
6. Apply the identical forward migrations to production. Migrations 0001–0008 are additive/security-oriented and compatible with the current app, so DB-first is the release order.
7. Create a staged Production web build with production variables; smoke it through the approved protected path.
8. Release Owner manually promotes the artifact to the canonical domain, runs production smoke, and monitors.

`supabase link` and remote `supabase db push` are forbidden in CI and ordinary developer validation. A Database Owner may use them only in an explicit release session after displaying and independently checking the target project reference and environment. `db reset` is local-only and is prohibited against linked/remote projects.

## Ownership

- Release Owner: candidate SHA, Vercel configuration, domain/TLS, CI evidence, promotion, rollback, and go/no-go.
- Database Owner: Supabase target verification, PostgreSQL compatibility, backup readiness, migrations, catalog evidence, and forward-fix decisions.
- Auth/Email Owner: Site URL/redirect allow-lists, confirmation, SMTP sender/domain, deliverability, rate limits, and recovery evidence.

One person may hold all roles during beta, but every release record names the person acting in each role.

## Smoke tests and data policy

Preview uses a synthetic preview-only account and synthetic trading data. Validate `/register`, confirmation, `/login`, `/onboarding`, `/trading/settings`, `/trading/new`, `/trading`, logout/login, forgot password, and reset password. Capture deployment SHA, origins, timestamps, and results. Do not copy production data into preview without a separately approved anonymization process.

Production uses a controlled, clearly marked synthetic smoke account with no shared credentials and minimum access. Validate the same path once, remove disposable trading records when appropriate, and rotate/remove credentials after the test. Never run Playwright reset, CI seeds, fixtures, or database reset against production.

## Rollback and release identity

The deployment record and Vercel metadata provide the Git commit SHA; do not expose extra build internals in the UI. Application rollback reassigns the canonical domain to the last known-good eligible deployment. A rollback does not rebuild environment variables, so verify the previous artifact's configuration remains valid.

Database rollback is forward-fix by default. Never run automatic down migrations. For an incompatibility: contain traffic, restore the compatible app artifact, preserve evidence, and apply a reviewed forward fix. Restore the database only through a previously tested recovery procedure with an explicit data-loss/RPO decision.

## Provisioning checklist

1. Select/verify the owned domain and accountable operators.
2. Create `phoenix-preview` and `phoenix-production` Supabase projects; record region and PostgreSQL major.
3. Create/import the Vercel project without adding production secrets; select Node 24.x and enable Corepack.
4. Add distinct Preview and Production public variables; verify scopes twice.
5. Assign the stable staging domain to the persistent preview branch/environment and configure exact preview Auth URLs.
6. Configure the production domain and exact production Auth URLs, but keep production domain auto-assignment disabled.
7. Validate preview migration/catalog, confirmation/recovery email, HTTPS, cookies, routes, and logs.
8. Capture records of variable scopes, TLS/domain, rollback eligibility, Git SHA, and smoke results.

