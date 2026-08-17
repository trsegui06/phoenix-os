# Trading Dashboard v1 — UX Audit

## Executive assessment

Dashboard v0.1 was functionally sound, responsive, accessible, and faithful to the approved read models. Its principal weakness was visual prioritization: six equal KPI cards and a later P&L section created a flat analytics wall rather than a calm cockpit narrative. No critical usability or accessibility defect was found. Direct Figma review was not available because the repository contains no accessible prototype link or asset.

## Issues found

| Severity | Finding | Resolution |
| --- | --- | --- |
| High | P&L, performance, risk, activity, and learning signals had equal visual weight. | Created a primary insight area for currency P&L, Win Rate, Average Risk, and Trade Error Rate; moved activity and learning into a quieter secondary strip. |
| Medium | Tables used left-aligned proportional numerals, reducing scanability. | Right-aligned numeric columns and applied tabular numerals. |
| Medium | Section transitions were weak across P&L, breakdowns, and discipline. | Added restrained narrative section headers and supporting context. |
| Medium | The empty state described absence but did not explain what happens next. | Added concise, non-blaming guidance without inventing unavailable actions. |
| Medium | The loading skeleton did not approximate the dashboard hierarchy. | Matched the filter, primary insight, activity, and table proportions more closely. |
| Low | Card shadows and uppercase labels were slightly overused. | Reduced elevation and reserved tracked uppercase treatment for small section eyebrows. |

## Changes implemented

- Established primary, secondary, breakdown, and discipline information tiers.
- Kept every currency separate and promoted multi-currency scanning without adding a total.
- Added numeric alignment and tabular typography to all comparison tables.
- Preserved backend ordering, exact labels, GET filters, and Server Component rendering.
- Refined empty and loading states without adding product actions or dependencies.

## Deliberately deferred

- Figma-specific alignment until an accessible prototype is supplied.
- Mobile card replacements for tables; horizontal scrolling remains clear and materially simpler.
- Authentication UI, data-entry UI, charts, rankings, and all new analytics.

## Design principles applied

Process before performance; one card per idea; restrained orange accent; low-noise surfaces; explicit money signs; no color-only meaning; and clear separation between outcome, risk, activity, learning, and discipline.

## Responsive assessment

The max-width shell, responsive filter grid, primary insight reflow, activity strip, and bounded table scrolling support desktop, tablet, and mobile widths without page-level horizontal overflow. Long labels remain in scrollable table regions rather than clipping the page.

## Accessibility assessment

Heading hierarchy, labeled inputs, keyboard focus, row headers, semantic table headers, status messaging, touch targets, and screen-reader profit/loss labels remain intact. Numeric alignment improves visual comparison without changing reading order.

## Remaining visual/product debt

- Direct comparison with the Phoenix Figma prototype.
- Validation with authenticated representative data screenshots once a stable UI authentication flow exists.
- A decision on whether mobile tables warrant alternate row cards after real-user testing.
