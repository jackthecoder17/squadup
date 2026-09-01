# 0008. Design system

- **Status:** accepted
- **Date:** 2026-09-01

## Context

Six phases built the product ad hoc — every screen hand-rolled its own buttons, cards and
`zinc-*` colours with per-element `dark:` variants. It worked but it wasn't coherent, and
there were no loading, empty, or error states.

## Decision

- **Semantic tokens, not raw palette.** `globals.css` defines one set of CSS custom
  properties — `--surface`, `--border`, `--foreground`, `--muted`, `--primary`,
  `--accent`, `--danger`, … — for light, and overrides them once for dark. Tailwind v4
  `@theme inline` maps them to utilities (`bg-surface`, `text-muted`, `border-border`),
  so a component never writes a `dark:` colour variant again.
- **Dark mode: OS by default, explicit override available.** Dark values apply under
  `@media (prefers-color-scheme: dark)` _and_ `:root[data-theme="dark"]`. A nav toggle
  writes `data-theme` + `localStorage`; an inline `<head>` script applies it before first
  paint so there's no flash.
- **A small primitive set** (`src/components/ui/`) — `Button` (+ `buttonClass` for links),
  `Card`, `EmptyState`, `PageHeader`, `Spinner`, `Skeleton`, `StatusDot` — kept
  deliberately minimal. No component library dependency.
- **Every async segment has states.** `loading.tsx` skeletons for `/app/*` and
  `/onboarding`, an `error.tsx` boundary with a retry, `not-found.tsx` for a missing
  match and the app root, and `EmptyState` for empty queues / feeds.
- **Client time is null on the server.** Relative timers (`WaitTimer`, the dashboard
  feed) start `null` and fill in after mount via `requestAnimationFrame`, so SSR and the
  first client render agree — no hydration mismatch and no cascading-render lint error.
- **Refactor, don't rewrite.** Existing screens kept their structure and every
  accessible name; the e2e suite (12 tests) is the regression guard for the visual pass.

## Consequences

- Adding a colour means one token in two places (light + dark), used everywhere.
- The `data-theme` script is a small inline `dangerouslySetInnerHTML` in the root layout;
  the `<html suppressHydrationWarning>` covers the attribute it sets.
- The mobile nav scrolls horizontally rather than collapsing to a menu — acceptable for
  four items; a drawer is the follow-up if it grows.
- A handful of one-off `zinc-*` classes deep in components were left where swapping them
  was pure churn; nothing renders a `dark:` colour variant any more.
