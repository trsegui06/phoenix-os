# Authentication UI v1

## Architecture

Phoenix uses Supabase Auth through the existing `@supabase/ssr` server-client factory. Login and logout are Server Actions. A narrowly matched Next.js 16 Proxy refreshes session cookies and performs early `/login` and `/trading` redirects; pages and actions still validate identity at their own trusted server boundary.

## Routes and flows

- `/login` accepts email/password through `signInWithPassword` and redirects successful sessions to `/trading`.
- `/trading` requires an authenticated `auth.getUser()` result before resolving the Trader and loading RLS-protected data.
- Logout calls Supabase `signOut`, clears the session cookies, and redirects to `/login`.
- An authenticated request for `/login` redirects to `/trading`.

## Session and Trader relationship

Supabase cookies are the session source of truth and are refreshed by `proxy.ts`. Auth identity and the domain Trader remain distinct: `auth.users.id` resolves through `traders.auth_user_id`. Login never creates a Trader. A missing profile produces a controlled workspace-not-configured state and is deferred to onboarding.

## Error and security boundaries

Local input is validated before authentication. Invalid credentials use one generic message; other provider failures use a safe availability message. No raw Supabase error, password, JWT, service-role credential, user-supplied redirect, ownership identifier, or authentication bypass is exposed. PostgreSQL RLS remains the authorization boundary.

## Deferred features

Public registration, email-verification UX, password recovery/change, OAuth, MFA, onboarding, account/profile management, and production abuse/rate-limit policy are intentionally deferred.
