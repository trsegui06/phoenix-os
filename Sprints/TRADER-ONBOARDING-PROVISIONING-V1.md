# Trader Onboarding & Provisioning V1

Authenticated users who do not yet own a Trader are routed to `/onboarding`. The server action accepts only `name` and an IANA `timezone`; the authenticated user ID is resolved from the Supabase session and is never accepted from the browser. Creation uses the existing `traders.auth_user_id` unique constraint and owner-only insert RLS policy, so concurrent or repeated provisioning can create at most one Trader.

After creation, the user is sent to `/trading/settings` to create the required Trading Account, Session, and Setup, then to `/trading/new` for their first Trade. Existing Traders skip onboarding and continue to `/trading`. Unauthenticated access to onboarding and all Trading routes redirects to `/login`.

This slice intentionally adds no registration, recovery, OAuth, MFA, profile editing, administrative provisioning, or schema migration.

Validation covers domain input, authenticated ownership, duplicate/concurrent creation, RLS isolation, route state transitions, the complete zero-to-first-Trade path, and responsive usability.
