# Trading Prerequisites Management v1

## Product objective and route

`/trading/settings` gives an authenticated, already-provisioned Trader one coherent place to create, list, and update the Trading Accounts, Sessions, and Setups required by Trade Entry. Dashboard and the New Trade prerequisite state link to it. Readiness is presentation-only: at least one owned record of every type.

## Architecture

The page is server-first and uses one authenticated Supabase server client. Account, Session, and Setup lists load in parallel through their existing services and repositories. Native forms post to thin settings actions that adapt HTML strings, call existing services, revalidate `/trading/settings`, `/trading/new`, and `/trading`, then redirect with restrained status markers. Client components and direct browser database writes are not introduced.

## Accounts

Prop Firm is nullable in the approved contract, so Accounts are created with no Prop Firm and no fake dependency. Account money is entered in major units and converted exactly to safe integer cents. Currency is normalized through the existing contract.

Currency and initial balance are create-only in this UI. Statistics v1 resolves historical Trade currency through the current Account, so editing currency would relabel history. Initial balance is likewise baseline context. Name, broker, type, status, and the paired current-balance snapshot remain editable. Current balance and timestamp must be supplied or cleared together.

## Sessions

Session date, type, market bias, emotional state, and notes follow the existing contract. All remain editable, but the UI warns that changing date or type can reclassify historical Trades and statistics because Trades retain the Session relation and current Session Type is a breakdown dimension.

## Setups

Setup forms group identity, context, and entry/exit/validation rules. All approved fields remain editable. The UI warns that edits change the current descriptive representation for historical linked Trades because Setup version history is not implemented.

## Security and lifecycle

Trader ownership is never accepted from form input. Auth-derived Trader resolution and RLS remain the final boundaries. Foreign records return safe unavailable behavior. Unauthenticated users redirect to Login; Auth users without a Trader receive the controlled workspace state. No service role, RLS bypass, delete action, archive lifecycle, or database migration is added.

## Self-service classification

An authenticated user with an existing Trader profile can now create all three prerequisites, see them immediately in Trade Entry, and record the first Trade without operator or database intervention. Classification: **TRADING MVP SELF-SERVICE FOR PROVISIONED TRADER**.

Trader profile provisioning, public registration, account recovery, delete/archive semantics, historical versioning, Review UI, and Objective UI remain deferred. The next onboarding blocker is the decision and implementation for Trader provisioning plus registration/recovery.
