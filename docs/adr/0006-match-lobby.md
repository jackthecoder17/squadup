# 0006. Match lobby

- **Status:** accepted
- **Date:** 2026-09-01

## Context

Once the engine forms a match, the players need somewhere to gather: chat, confirm
they're in, start, and afterwards say whether their teammates were any good.

## Decision

- **A per-match SSE channel, separate from the global one.** `/api/match/[id]/stream`
  subscribes to `mm:match:<id>` and is gated on the requester being a `MatchPlayer`.
  Chat and ready state are match-private — putting them on the global `mm:events`
  channel would fan every keystroke out to every connected user. The lobby page opens
  only this stream (it doesn't need the global online count).
- **State machine on `Match.state`:**
  `FORMED → READY` (auto, when every `MatchPlayer.ready` is true; reverts if someone
  un-readies) `→ LIVE` (any player hits Launch) `→ COMPLETED` (any player hits Finish).
  Any player leaving while `FORMED`/`READY` sets `CANCELLED`.
  The transition rules are a pure function (`stateAfterReadyChange`) with unit tests; the
  service just persists the result and publishes a `state` event.
- **Leaving dissolves the match.** There's no backfill yet, and a 4-player lobby waiting
  on a no-show is worse than everyone re-queueing. On cancel, every player's presence
  goes back to `online` and a `match-cancelled` event goes out on the _global_ channel
  so anyone still looking at the queue page clears their stale "Open lobby".
- **Chat is persisted** (`MatchMessage`) so a reload or the roster page shows history;
  the SSE frame is the live path, the DB is the source of truth. Last 100 messages.
- **Ratings** (`PlayerRating`, `-1`/`+1`, unique per `(match, from, to)`) are accepted
  once the match is `LIVE` or `COMPLETED`, teammate-only, self-excluded. Nothing surfaces
  them yet — they're the substrate for a reputation score later.
- **Client trusts the stream after mount**, same as the queue: the page server-renders
  initial state (players, ready flags, message history, this user's ratings) and the
  lobby component updates purely from SSE frames plus optimistic flips.

## Consequences

- Two SSE endpoints now (`/api/stream`, `/api/match/[id]/stream`); each connection still
  needs its own ioredis subscriber.
- No reconnection snapshot on the match stream — a client offline during a `state` change
  misses it until it reloads. Acceptable for a lobby that's open for minutes; the roster
  page re-fetches on load.
- `COMPLETED` is player-driven (a Finish button), since there's no real game integration
  to detect the match ending.
- Cancel is destructive and immediate with no confirm; fine for a lobby, revisit if
  backfill lands.
