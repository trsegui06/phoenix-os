# Review Workflow UI V1

## Product objective

Review Workflow V1 closes the first Phoenix learning loop: record Trades, inspect outcomes, create a structured Review, connect evidence and Objectives, preserve learning, and revisit the artifact. It reinforces **process before performance** and **discipline before profit** without scoring or automated coaching.

## Routes and workflow

- `/trading/reviews`: period-first Review index, newest period first, with relation counts and purposeful empty state.
- `/trading/reviews/new`: create a Review from the existing domain contract.
- `/trading/reviews/[id]`: read the narrative and linked owned records.
- `/trading/reviews/[id]/edit`: update fields and atomically replace each relation set.

Dashboard → Reviews → New Review → Detail → Edit → Detail → Dashboard has no dead end. Successful create and update redirect to Detail with restrained server-rendered confirmation.

## Review field UX

The UI preserves the existing model: `reviewType`, `periodStart`, `periodEnd`, `summary`, `strengths`, `weaknesses`, and `actionPlan`. Labels translate those semantics into Review summary, What worked, What needs work, and Next actions. No persisted field or vocabulary was invented. Domain validation retains strict date-only parsing and requires end on or after start.

## Trade and Objective relations

Trade selection is bounded to the 200 most recent owned Trades and filtered in the form to the selected period; already-linked records remain visible during editing. Labels use date, asset, direction, result, and currency-scoped P&L. P&L is never aggregated across currencies.

Objectives are optional and display title, status, category, and target date when present. An empty state explains that Objective Management remains separate; no Objective CRUD was added.

## Atomic update and security

The existing `replace_review_trade_links` and `replace_review_objective_links` authenticated RPCs remain the only replacement path. They validate the complete requested set before mutation and preserve rollback on foreign relationships. Services resolve ownership through `auth.uid()` → `traders.auth_user_id`; no UI, action, or domain input accepts `traderId`. RLS remains the final boundary. Unauthenticated users route to `/login`; authenticated users without a Trader route to `/onboarding`.

## Responsive and accessible UX

Pages use the current dark cockpit language, restrained orange actions, cards rather than wide Review tables, one H1, semantic sections and fieldsets, explicit labels, keyboard-native checkboxes, visible focus styles, live error/status messaging, and mobile-first controls. Target viewports are 1440×900, 1024×768, 768×1024, and 390×844.

## Daily-use intent and deferred lifecycle

The form keeps the period and narrative hierarchy ahead of optional evidence. Review deletion, Review scoring, Objective Management UI, AI coaching, Discipline Score, Phoenix Score, and release-hardening continuation remain deliberately deferred. Real personal use should drive the next UX iteration.
