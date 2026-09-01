# squadup

Matchmaking for **people, not lobbies**. Players set the games they play, their roles,
rank, region, languages and availability, drop into a queue, and a matchmaking engine
groups them with players who actually fit — then drops the group into a lobby with chat
and a ready-up flow.

> Portfolio project. The interesting part is the **matchmaking engine + a live
> visualizer driven by simulated players**, so the whole system demos under load with
> zero real users.

## Stack

| Concern       | Choice                                                      |
| ------------- | ----------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, RSC, Server Actions), React 19.2    |
| Language      | TypeScript (strict)                                         |
| Styling       | Tailwind CSS v4                                             |
| Database      | PostgreSQL + Prisma ORM                                     |
| Realtime      | Server-Sent Events backed by Redis pub/sub                  |
| Queue / cache | Redis (`ioredis`)                                           |
| Auth          | Auth.js v5 — Discord OAuth, Prisma adapter                  |
| Worker        | Standalone Node process (`tsx`) running the matching passes |
| Tests         | Vitest + Testing Library (unit), Playwright (e2e)           |
| Tooling       | ESLint (flat), Prettier, Husky + lint-staged, Commitlint    |
| CI            | GitHub Actions — format, lint, typecheck, test, build, e2e  |

## Architecture

```
                         ┌─────────────────────────────┐
  Browser  ──HTTP/RSC──▶ │  Next.js app (app/)          │
     ▲                   │  · Server Components / Actions│
     │  SSE stream        │  · Route handlers            │
     └───────────────────┤  · /api/stream (SSE)         │
                         └───────┬─────────────┬────────┘
                                 │             │
                         Prisma  │             │  publish / subscribe
                                 ▼             ▼
                         ┌────────────┐   ┌──────────┐
                         │ PostgreSQL │   │  Redis   │
                         │  users,    │   │ queue set│
                         │  profiles, │   │ presence │
                         │  matches   │   │ pub/sub  │
                         └─────▲──────┘   └────▲─────┘
                               │               │
                         ┌─────┴───────────────┴────────┐
                         │  Matchmaking worker (worker/) │
                         │  · reads queue every N s      │
                         │  · constraint scoring         │
                         │  · forms groups, writes match │
                         │  · publishes events           │
                         └───────────────────────────────┘
                                       ▲
                         ┌─────────────┴────────────┐
                         │  Player simulator         │
                         │  bots join/leave the queue│
                         └───────────────────────────┘
```

Decisions and their rationale live in [`docs/adr/`](docs/adr).

## Getting started

Prerequisites: Node 20.9+, pnpm 10, Docker.

```bash
pnpm install
cp .env.example .env          # then fill AUTH_SECRET + Discord creds
pnpm db:up                    # Postgres + Redis via docker compose
pnpm db:migrate               # apply schema
pnpm dev                      # http://localhost:3000
```

Run the worker and simulator (added in later phases) in separate terminals:

```bash
pnpm worker
pnpm simulate
```

## Scripts

| Script                 | Does                                         |
| ---------------------- | -------------------------------------------- |
| `pnpm dev`             | Next dev server (Turbopack)                  |
| `pnpm build`           | Production build                             |
| `pnpm validate`        | format check → lint → typecheck → unit tests |
| `pnpm test`            | Vitest once                                  |
| `pnpm test:watch`      | Vitest watch                                 |
| `pnpm test:e2e`        | Playwright                                   |
| `pnpm db:up` / `:down` | Start / stop local Postgres + Redis          |
| `pnpm db:migrate`      | `prisma migrate dev`                         |
| `pnpm db:studio`       | Prisma Studio                                |

## Roadmap

| Phase | Branch                   | Scope                                                     |
| ----- | ------------------------ | --------------------------------------------------------- |
| 0     | `chore/project-setup`    | Tooling, CI, Docker, env validation, Prisma init          |
| 1     | `feat/auth`              | Auth.js + Discord OAuth, protected routes                 |
| 2     | `feat/player-profiles`   | Onboarding: games, roles, rank, region, languages, avail. |
| 3     | `feat/matchmaking-queue` | Enter/leave queue, presence, SSE + Redis pub/sub          |
| 4     | `feat/match-engine`      | Worker, constraint scoring, group formation, Glicko-2     |
| 5     | `feat/match-lobby`       | Lobby, text chat, ready-up, post-match rating             |
| 6     | `feat/player-simulator`  | Bot players + live visualizer dashboard                   |
| 7     | `feat/design-system`     | Design system, dark theme, responsive, a11y, empty states |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). TL;DR: Conventional Commits, branch per phase,
`pnpm validate` must pass, hooks enforce it.
