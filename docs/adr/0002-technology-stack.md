# 0002. Technology stack

- **Status:** accepted
- **Date:** 2026-09-01

## Context

Solo developer, TypeScript-first. Goal is full-stack polish: a real-time, two-sided
matchmaking app that looks and behaves like production software and can be run end-to-end
from one repo. It must demo without real users.

## Decision

- **Next.js 16 App Router** end to end — one deployable, Server Components + Server
  Actions for most mutations, route handlers where a raw HTTP surface is needed (SSE).
- **PostgreSQL + Prisma** — relational data (users, profiles, matches, ratings) with a
  typed client and migrations. Prisma pinned to stable `7.x`, not the `8.0` RC.
- **Redis** — ephemeral matchmaking state (queue membership, presence TTLs) and a
  pub/sub bus between the worker and the web process. Wrong tool for durable data, right
  tool for a fast-moving queue.
- **Server-Sent Events, not WebSockets**, for pushing queue/lobby updates to the client.
  One-directional server→client fits the use case; SSE needs no custom server and works
  cleanly with Next route handlers and Turbopack dev. Client→server messages (chat,
  ready-up) go through Server Actions / route handlers.
- **Standalone worker process** for the matching loop, run with `tsx`, sharing the
  Prisma and Redis clients via `src/server`. Keeps CPU-bound matching off request
  handlers and models how this would really be deployed.
- **Auth.js v5** with a single provider (Discord) — OAuth only, no passwords to store,
  and Discord is the right identity provider for a gaming audience.
- **Vitest** for unit tests (fast, Vite-native, ESM) with framework-free domain logic;
  **Playwright** for end-to-end coverage of the critical flows.

## Consequences

- Running the full experience locally needs three processes (`dev`, `worker`,
  `simulate`) plus Docker. Documented in the README; `docker compose` covers the
  infra.
- SSE means no server-authored client→server realtime; acceptable given the flows.
- Redis is another moving part to run, justified by the queue/presence/pub-sub needs.
- Prisma `7.x` over the `8.0` RC trades newest features for stability appropriate to a
  showcase repo.

## Alternatives considered

- **WebSockets (Socket.IO / a custom server)** — bidirectional and familiar, but forces
  a custom server, complicates Turbopack dev and deployment, and the app only needs
  server→client push.
- **Supabase Realtime / Pusher** — removes the Redis/SSE plumbing but hides the part of
  the system that's most worth showing, and adds a hosted dependency.
- **Postgres `LISTEN/NOTIFY` instead of Redis** — one fewer service, but no natural
  home for queue membership and presence TTLs, and connection-bound notify semantics.
- **All-in-one `next dev` with in-process matching** — simpler, but hides the worker
  boundary that makes the architecture realistic.
