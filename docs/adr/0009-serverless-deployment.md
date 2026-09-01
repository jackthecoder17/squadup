# 0009. Serverless deployment on free tiers

- **Status:** accepted
- **Date:** 2026-09-01

## Context

The app is meant to be reachable at a URL for $0. Vercel + Neon + Upstash cover the web
app, Postgres and Redis for free. The problem is the two long-lived processes — the
matchmaking worker and the bot simulator — which have no good always-free home.

## Decision

- **Replace the worker + simulator with a cron-poked endpoint.** `POST /api/cron/tick`
  (`src/app/api/cron/tick/route.ts`) ensures the bot pool exists, then runs a short burst
  (`CRON_BURST`, default 8) of `simulateTick` + `runMatchTick`, advancing a simulated
  clock across the burst so wait-time relaxation still fires. It's guarded by
  `CRON_SECRET` (Bearer header) — the same header Vercel Cron sends automatically.
- **A GitHub Actions schedule drives it**, `*/5 * * * *`, curling the endpoint. Free for
  a public repo and always available. Cadence is coarse (~5 min) so the dashboard shows
  activity in bursts, but SSE still pushes each queue/match event live.
- **SSE routes get `maxDuration = 60`** and both re-sync on connect (the global stream
  already sent a snapshot; the match stream now re-emits current state + ready flags), so
  the serverless duration cap just means a silent reconnect every minute.
- **`vercel-build`** runs `prisma migrate deploy && prisma db seed && prisma generate &&
next build`, so a deploy migrates and seeds Neon with no manual step.
- **One `DATABASE_URL`, the direct connection.** Migrations need a direct connection
  anyway, and the traffic doesn't justify wiring up a second pooled URL. Pooling is noted
  in `DEPLOY.md` as an optional upgrade.
- **`DEPLOY.md`** carries the click-by-click: create the three accounts, paste seven env
  vars, add the Discord redirect URI, set two repo secrets.

## Consequences

- Not second-by-second live in production. Acceptable for a portfolio demo; a $5/mo
  worker host (Railway, Koyeb) restores real-time with no code change — just run
  `pnpm worker` / `pnpm simulate` against the prod `DATABASE_URL` / `REDIS_URL`.
- The cron endpoint does real writes on a `GET` too (Vercel Cron uses GET); the
  `CRON_SECRET` guard is what keeps it from being a public "make 30 bots" button.
- First cron call after a cold Neon DB is slower (pool creation + cold start); still well
  inside the 60s budget at the default burst.
- Upstash free tier limits (daily commands, concurrent connections) bound how many
  simultaneous SSE viewers the deploy supports — fine for a demo, not a launch.
