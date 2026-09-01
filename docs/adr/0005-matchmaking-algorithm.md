# 0005. Matchmaking algorithm

- **Status:** accepted
- **Date:** 2026-09-01

## Context

The engine has to turn a queue into valid groups of `teamSize` players, balancing skill,
region, language, and play intent — and it must never leave a player stuck forever
because their constraints are hard to satisfy. Optimal group partitioning under multiple
soft constraints is NP-hard; a real matchmaker doesn't need optimal, it needs _good and
fast, every few seconds_.

## Decision

- **Greedy seed-and-grow.** Each tick, candidates are sorted by wait time (longest
  first). The most patient unmatched player seeds a group; the group then repeatedly
  absorbs the highest-scoring compatible candidate until it's full. A seed that can't be
  filled this tick is left alone — by the next tick its constraints have relaxed.
- **Every constraint relaxes with wait time**, driven by the _longest_ wait in the
  forming group:
  - **Region** — same region only, then distance ≤ 1 (a small adjacency graph), then
    anywhere.
  - **Skill** — an allowed rank-tier spread that starts at 2 and widens one tier per
    minute, capped.
  - **Play intent** — CASUAL/COMPETITIVE can't mix until a threshold; BOTH always bridges.
  - **Language** — a shared language is required until a threshold, then optional.
- **`isCompatible` is a hard gate; `groupFitScore` ranks the survivors** by role
  diversity, rank tightness, region proximity, language overlap, exact play-style match,
  and a small per-second wait bonus that pulls long-waiters in.
- **Deterministic.** No randomness; ties break by wait then userId, so the same queue
  state always produces the same groups — which is what makes the algorithm unit-testable.
- **All of it is pure** (`src/lib/matchmaking/`, ~25 unit tests). The worker
  (`src/worker/`) only does I/O: read the queue + tickets from Redis, call `formMatches`,
  then per group atomically claim the players (`ZREM`, roll back if anyone bailed
  mid-tick), write a `Match` + `MatchPlayer` rows, set presence to `in_match`, and
  publish a `match` event. Stale queue entries whose ticket TTL'd out are pruned.
- **Tickets carry a language list** now, copied from the profile at enqueue time, so the
  worker never has to touch Postgres per candidate.

## Consequences

- Greedy can miss a grouping a global optimizer would find; acceptable, and the next
  tick gets another go with relaxed constraints.
- A burst of very similar players matches instantly; a lone outlier waits, then widens.
- The relaxation curves are guesses (`DEFAULT_MATCH_CONFIG`) — they're all in one typed
  object so they can be tuned against real wait/quality data later.
- The `match` event broadcasts member userIds on the shared channel and clients filter;
  fine for this scale, a real system would use per-user channels.
- Matches are written `FORMED`; the lobby phase drives them through `READY` / `LIVE`.
