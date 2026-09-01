# squadup — notes for AI agents

Read `AGENTS.md` first (Next.js 16 differs from older training data — request APIs are
async-only, `middleware` is now `proxy`, Turbopack is default).

## What this is

Portfolio project: a real-time, two-sided matchmaking app for gamers. Centerpiece is the
matchmaking engine + a live visualizer fed by simulated players. See `README.md` for the
architecture diagram and phase roadmap, `docs/adr/` for why things are the way they are.

## Conventions

- Package manager: **pnpm**. Node 20.9+.
- **Conventional Commits**, enforced by commitlint. One branch per roadmap phase.
- `pnpm validate` (format + lint + typecheck + unit) must pass before a commit; hooks enforce it.
- Env only through `@/env`. Server-only code lives under `src/server/` by convention
  (no `server-only` import — the worker and integration tests import these modules too).
- Domain logic (matching, scoring, ratings) stays framework-free and unit-tested.
- Prefer Server Components / Server Actions; add `"use client"` only when required.
- Tests: `pnpm test` = fast unit (jsdom, pure). `pnpm test:int` = `*.int.test.ts` against
  real Postgres + Redis (`pnpm db:up` first). `pnpm test:e2e` = Playwright.

## Layout

```
src/app/         routes (App Router)
src/server/      server-only: db client, redis client, auth, domain services
src/lib/         isomorphic helpers
src/worker/      standalone matchmaking worker (added in feat/match-engine)
prisma/          schema + migrations
docs/adr/        architecture decision records
e2e/             Playwright specs
```
