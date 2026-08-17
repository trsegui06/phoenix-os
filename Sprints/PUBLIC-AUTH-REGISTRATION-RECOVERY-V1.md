# Public Auth Registration & Recovery V1

Phoenix exposes email/password registration at `/register`, recovery requests at `/forgot-password`, and verified password updates at `/reset-password`. Registration uses the normal Supabase `signUp` API and never creates a Trader automatically. An immediate session routes to `/onboarding`; when confirmation is enabled, the user receives an enumeration-safe pending message and `/auth/callback` exchanges the PKCE code before routing to onboarding or Trading.

The local Supabase configuration intentionally has email confirmation disabled and a six-character provider minimum. Production confirmation policy remains a deployment decision. Both signup and recovery redirect only to the configured `NEXT_PUBLIC_SITE_URL` origin and the fixed `/auth/callback` path; arbitrary return URLs are not accepted.

Recovery always returns an account-enumeration-safe response. The request creates a short-lived, HTTP-only random state cookie. The callback exchanges the single-use Supabase PKCE code, validates that state, and authorizes the reset form for ten minutes. The update action again requires both the recovery marker and the authenticated recovery session, calls `updateUser`, signs the recovery session out, and returns to `/login?reset=success`. Passwords and tokens are never logged or stored in the public database.

Local email is captured by Mailpit at the URL reported by `supabase status`. Production requires a trusted site URL and SMTP provider. Abuse controls rely on Supabase/provider limits in v1; infrastructure-level rate limiting, monitoring, OAuth, and MFA remain deferred. No service-role or admin Auth API is used.
