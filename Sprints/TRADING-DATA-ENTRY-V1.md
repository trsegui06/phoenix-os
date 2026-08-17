# Trading Data Entry v1

## Contract

`/trading/new` is an authenticated, server-backed form. It resolves the current Trader from the authenticated user and loads owned Trading Accounts, Sessions, and Setups through the existing service layer. It never accepts a Trader ID from the browser.

Risk is entered as a percentage and converted exactly to integer basis points. Realized P&L is entered in the selected account currency and converted exactly to integer cents; blank remains unresolved and zero remains zero. Prices and position size accept at most eight decimal places.

## Atomic persistence

Migration `0007_trade_entry_atomic_creation.sql` exposes `create_trade_with_errors` only to `authenticated`. The `SECURITY DEFINER` function uses an empty search path, fully qualified objects, derives ownership from `auth.uid()`, validates every parent relationship, and inserts the Trade plus zero or more Trade Errors in one PostgreSQL transaction. Any invalid child insert rolls back the Trade.

## UX and failure behavior

The page is grouped into Context, Execution, Outcome, and Reflection. Missing prerequisites and missing Trader profiles render controlled states. Validation is server authoritative, pending submission is disabled, and persistence failures return a generic message. Success redirects to `/trading?created=trade`, where the dashboard confirms the write and reads refreshed statistics.
