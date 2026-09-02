# 0007. Player simulator and live dashboard

- **Status:** accepted
- **Date:** 2026-09-01

## Context

The whole point of the project is a matchmaker that works. With no real users there's
nothing to match, and nothing to show. It needs a population and a window into it.

## Decision

- **Bots are real rows.** `User.isBot = true` plus a full `PlayerProfile` (seeded from a
  deterministic generator, `src/lib/sim-bots.ts`). Fake Redis-only tickets would fail the
  `MatchPlayer` foreign key on match creation; real users make the whole pipeline — queue,
  worker, lobby — exercise for real, and the dashboard shows real data.
- **The simulator is a third process** (`src/simulator/`, `pnpm simulate`, `tsx`),
  alongside `dev` and `worker`. Each tick: idle bots join a random one of their games,
  queued bots leave with a small probability, any match made up entirely of bots is
  marked `COMPLETED` so its bots churn back into the queue, and any bot sharing a lobby
  with a real player readies up — so a solo user can drive the lobby → launch → rate flow
  without needing other people. `ensureBotPool` is idempotent and cheap on restart.
- **The bot population is deliberately clustered**, not uniform: regions and games are
  weighted toward the popular ones, ranks are drawn from a bell around the middle of each
  ladder, and each bot plays only one or two games. A realistic player base is dense; a
  population spread evenly across 8 games × 10 regions × 9 ranks never fills a lobby, and
  testing the algorithm against that isn't a fair test.
- **The worker prunes ghosts.** A queue member whose `User` row no longer exists (account
  deleted between enqueue and match) is dropped from the queue instead of crashing the
  tick on the foreign key.
- **The dashboard reuses the global stream.** `/app/dashboard` opens `/api/stream` and
  renders online count, per-game queue bars, and a live "matches forming" feed. The
  `match` event was enriched with `region` and `rankSpread` so the feed needs no extra
  fetch. Initial state is server-rendered (`getSnapshot` + `getRecentMatches`).
- **Bot generation is pure and unit-tested**; the DB-touching `ensureBotPool` /
  `simulateTick` have an integration test that fills queues, forms all-bot matches, and
  checks they resolve.

## Consequences

- Running the full demo is four processes (`dev`, `worker`, `simulate`, plus Docker).
  Documented; `SIM_BOTS` tunes the load.
- The simulator writes bot users to the same database as real ones. `isBot` keeps them
  filterable; a teardown is `DELETE FROM "User" WHERE "isBot"`.
- The relaxation-curve constants were nudged (`rankSpreadStepMs` 60s → 45s) once the
  simulator made the real behaviour under load visible — which is exactly what it's for.
- The `match` feed is driven by the broadcast `match` event, so every viewer sees every
  match form; fine at this scale.
