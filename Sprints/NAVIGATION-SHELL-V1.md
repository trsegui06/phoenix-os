# Phoenix OS — Navigation Shell V1

## Objective

Unify the authenticated Trading routes into one calm application shell so users always understand their location, primary actions, and path back to the Dashboard.

## Information architecture

The shell exposes exactly four Trading destinations: Dashboard, New Trade, Reviews, and Trading Setup. Trading Accounts, Sessions, and Setups remain internal to Trading Setup. Objectives and future Wealth, Psychology, Automation, scoring, and coaching modules remain outside the navigation.

## Desktop and tablet behavior

At 1024px and above, a persistent restrained sidebar carries Phoenix identity, primary navigation, workspace context, and server-side Logout. At 768–1023px, the spacious content column and four-entry bottom navigation are retained rather than compressing existing forms and dashboard panels. The shell has no collapse state, metrics, badges, or decorative widgets.

## Mobile behavior

Below 768px, Phoenix identity and Logout remain in a compact top bar while a fixed safe-area-aware bottom navigation exposes Dashboard, Trade, Reviews, and Setup. Page content includes bottom clearance so controls and forms are not obscured.

## Active route mapping

- `/trading`: Dashboard
- `/trading/new`: New Trade / Trade
- `/trading/reviews` and every nested Review route: Reviews
- `/trading/settings`: Trading Setup / Setup

Active links use `aria-current="page"`, a border, a surface change, and an accent marker so state is not communicated by color alone.

## Auth integration and boundaries

The shell wraps existing route-level server guards without introducing a second Auth guard. Unauthenticated users still redirect to `/login`; authenticated users without a Trader still redirect to `/onboarding`. Logout reuses the existing server action. Navigation performs no data access and exposes no financial or account data.

## Server and client boundaries

The layout, shell, page header, identity, and Logout remain Server Components. Only the navigation-link renderer is a Client Component because it reads the current pathname to mark route families active. No global state or navigation dependency is introduced.

## Accessibility and responsive acceptance

Both navigation variants use semantic labelled `nav` elements, explicit link names, keyboard-native links, visible focus rings, `aria-current`, and minimum mobile touch heights. Acceptance targets are 1440×900, 1024×768, 768×1024, and 390×844 with no horizontal overflow or content overlap.

## Deferred Post-Usage Polish

Exact sidebar width, micro-spacing, animation tuning, badge counts, shortcuts, customizable ordering, theme personalization, and icon refinements are deferred until real daily usage provides evidence. Future modules and Objective Management remain outside this sprint.
