# Phoenix OS — Controlled Public Beta Release Checklist

Every item requires a named owner, timestamp, and evidence link. Any unchecked HIGH item is a no-go.

## Candidate and repository

- [ ] Feature freeze declared; candidate commit recorded and tagged.
- [ ] Worktree clean; candidate is on `main` through reviewed PR.
- [ ] `main` protection and required status checks are enabled and evidenced.
- [ ] CI uses Node 24.14.0 and pnpm 11.16.0 (or the manifest is intentionally updated in a separate reviewed change).
- [ ] `pnpm install --frozen-lockfile` passes without engine mismatch.
- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build` pass.
- [ ] `pnpm audit --prod` passes at the agreed severity threshold.
- [ ] Secret scanning passes and no generated `.next`, test, Supabase temp, env, log, or credential artifact is tracked.

## Web deployment

- [ ] Hosting provider, production owner, preview owner, and rollback operator recorded.
- [ ] Preview and production are separate; preview cannot access production Supabase.
- [ ] Canonical domain resolves and HTTPS certificate is valid and auto-renewing.
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` are set per environment.
- [ ] No service-role, database password, SMTP password, or management token is browser-visible.
- [ ] CSP, frame protection, MIME sniffing protection, Referrer-Policy, and Permissions-Policy verified over HTTPS.
- [ ] Deployment artifact/commit is identifiable and rollback or traffic-disable procedure tested.

## Supabase and database

- [ ] Isolated preview and production projects exist; PostgreSQL major version matches the migration test environment.
- [ ] Production network/access controls, owners, MFA and least-privilege dashboard access reviewed.
- [ ] Backup frequency/retention/plan limits recorded; pre-release snapshot taken where supported.
- [ ] Restore drill into non-production completed; measured RPO/RTO recorded.
- [ ] Migrations `0001`–`0007` applied in order to preview and their ledger captured.
- [ ] Preview RLS confirms all 11 public tables enabled and cross-tenant/anonymous tests pass.
- [ ] All `SECURITY DEFINER` functions have fixed empty search path, qualified objects, internal ownership derivation, and only required execute grants.
- [ ] Unused `anon`/`authenticated` table privileges, including `TRUNCATE`, `TRIGGER`, and `REFERENCES`, explicitly revoked and regression-tested.
- [ ] Identical reviewed migrations applied to production by the named migration owner.
- [ ] No reset, ad-hoc dashboard schema edit, or destructive rollback command used.

## Auth, email, and abuse

- [ ] Production Site URL is the exact canonical HTTPS origin.
- [ ] Redirect allow-list contains only required exact HTTPS callback URLs.
- [ ] Email confirmation enabled and tested from registration through onboarding.
- [ ] Custom SMTP sender/domain verified; SPF/DKIM/DMARC posture recorded.
- [ ] Registration confirmation and password recovery delivered to representative inbox providers.
- [ ] Bounce/complaint visibility and alert owner established.
- [ ] Password minimum/requirements and secure password change policy approved.
- [ ] Provider rate limits reviewed for cohort size.
- [ ] CAPTCHA enabled, or a time-bounded risk acceptance documents thresholds, owner, and activation trigger.
- [ ] Registration can be disabled quickly without affecting existing-user login.

## Monitoring and incident response

- [ ] Client/server exception monitoring receives a deliberate test error tagged with release commit.
- [ ] Sensitive-value redaction verified; tokens, cookies, passwords, auth codes, notes and secret values are never logged.
- [ ] External HTTPS uptime check and alert delivery tested.
- [ ] Supabase Auth/database health visibility and alert path verified.
- [ ] Named on-call/incident owner, acknowledgement target, escalation path and status communication route recorded.
- [ ] Incident runbook covers contain, disable registration, rollback, credential rotation, user communication and postmortem.

## Privacy, terms, support, and data operations

- [ ] Privacy notice published and reviewed for launch jurisdictions.
- [ ] Terms/acceptable-use and trading-risk/non-advice disclaimer published.
- [ ] Support/security contact works and has an accountable responder.
- [ ] Data export/correction request procedure tested.
- [ ] Account closure and personal/trading data deletion procedure tested, including Auth and database records.
- [ ] Retention schedule and processor/subprocessor record approved.

## Performance and smoke test

- [ ] Representative preview dataset shows acceptable dashboard and form latency; thresholds recorded.
- [ ] API/list payloads are bounded; pagination plan is accepted before dataset growth.
- [ ] Logged-out protected-route redirect works.
- [ ] Confirmed user completes onboarding, creates prerequisites, records a trade with errors, sees dashboard update, and logs out.
- [ ] Recovery email changes password; old password fails and new password succeeds.
- [ ] Second synthetic tenant cannot read or mutate the first tenant’s data.
- [ ] Mobile and desktop critical routes render without blocking overflow or errors.
- [ ] Production smoke uses synthetic data only and removes it through the approved data-operation process.

## Go/no-go

- [ ] Every HIGH blocker in `Sprints/PUBLIC-MVP-RELEASE-READINESS-AUDIT.md` is closed with evidence.
- [ ] Product, release, database, security/operations, and legal/privacy owners sign go.
- [ ] Initial cohort size, invite list, monitoring window, support coverage, and stop criteria recorded.
- [ ] Release announcement includes support route and known limitations.

**Decision:** GO / NO-GO  
**Candidate commit:**  
**Release time:**  
**Approvers:**  
**Evidence index:**
