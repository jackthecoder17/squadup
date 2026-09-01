# 0004. Realtime queue with SSE and Redis

- **Status:** accepted
- **Date:** 2026-09-01

## Context

The queue has to feel alive: a join or leave anywhere should show up on every open
client within a second, and the app should show how many people are online. This is
fast-moving, disposable state — the wrong thing to keep in Postgres.

## Decision

- **Redis holds the live queue.** Per game, `mm:queue:<slug>` is a sorted set keyed by
  userId, scored by enqueue time — FIFO order and wait time fall out of the score, and
  the Phase 4 worker can range-scan it. Each entry also writes a
  `mm:ticket:<user>:<slug>` hash (region, rank, roles, playstyle) with a 30-minute
  safety TTL, so the worker never has to touch Postgres per candidate and a vanished
  client can't wedge the queue forever.
- **Presence is a TTL + an index.** `mm:presence:<user>` (45s TTL) plus a
  `mm:presence:index` sorted set scored by last-seen. Online count = reap the index by
  score, then `ZCARD`. No client heartbeat: holding the SSE connection _is_ the
  liveness signal — the stream handler refreshes the TTL every 20s and drops presence
  on disconnect.
- **One Redis pub/sub channel, `mm:events`.** Join/leave publish
  `{ kind: "queue", gameSlug, size }`; connect/disconnect publish
  `{ kind: "presence", online }`. The steady-state heartbeat is silent.
- **Server-Sent Events, not WebSockets.** The traffic is server→client only. SSE is a
  plain `GET` route handler returning a `ReadableStream` — no custom server, works with
  Turbopack dev and `next start`, and `EventSource` reconnects on its own. Client→server
  (join/leave) stays on Server Actions.
- **The client trusts the stream after mount.** The page server-renders an initial
  snapshot; from then on the panel updates purely from SSE frames, with an optimistic
  local flip on the user's own join/leave. Queue actions deliberately do **not**
  `revalidatePath` — that would re-run the RSC and fight the stream.
- **Pure logic is extracted and unit-tested**: `queue.ts` (ticket build + Redis-hash
  (de)serialization + wait-time formatting) and `sse.ts` (frame formatting).

## Consequences

- Another moving part to run locally (`pnpm db:up` already starts Redis).
- Each SSE connection uses a dedicated ioredis subscriber connection (ioredis puts a
  connection in subscriber mode exclusively). Fine for the expected client count; a
  large fan-out would want a shared fan-in subscriber.
- Presence is best-effort: a hard crash leaves the user "online" for up to 45s.
- If a client is disconnected during a `queue` event it misses it, but reconnect pulls
  a fresh snapshot, so it self-heals.
- `X-Accel-Buffering: no` and `Cache-Control: no-transform` are set so intermediary
  proxies don't buffer the stream.
