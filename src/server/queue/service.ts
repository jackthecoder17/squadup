import { GAME_CATALOG } from "@/lib/games";
import {
  PRESENCE_TTL_SECONDS,
  TICKET_TTL_SECONDS,
  parseTicket,
  serializeTicket,
  type QueueTicket,
} from "@/lib/queue";
import type { StreamEvent } from "@/lib/sse";
import { CHANNEL, redis } from "@/server/redis";

export type PresenceStatus = "online" | "queued" | "in_match";

const PRESENCE_INDEX = "mm:presence:index";

const queueKey = (slug: string) => `mm:queue:${slug}`;
const ticketKey = (userId: string, slug: string) => `mm:ticket:${userId}:${slug}`;
const presenceKey = (userId: string) => `mm:presence:${userId}`;

function publish(event: StreamEvent): Promise<number> {
  return redis.publish(CHANNEL, JSON.stringify(event));
}

/** Reap presence entries past their TTL, then count what's left. */
export async function onlineCount(now = Date.now()): Promise<number> {
  await redis.zremrangebyscore(PRESENCE_INDEX, 0, now - PRESENCE_TTL_SECONDS * 1000);
  return redis.zcard(PRESENCE_INDEX);
}

/**
 * Refresh the caller's presence TTL. `announce` broadcasts the new online count;
 * the periodic heartbeat leaves it false so steady state stays quiet — the count
 * only really moves on connect/disconnect.
 */
export async function touchPresence(
  userId: string,
  status: PresenceStatus,
  { announce = false, now = Date.now() }: { announce?: boolean; now?: number } = {},
): Promise<void> {
  await redis
    .multi()
    .set(presenceKey(userId), status, "EX", PRESENCE_TTL_SECONDS)
    .zadd(PRESENCE_INDEX, now, userId)
    .exec();
  if (announce) {
    await publish({ kind: "presence", online: await onlineCount(now) });
  }
}

export async function dropPresence(userId: string, now = Date.now()): Promise<void> {
  await redis.multi().del(presenceKey(userId)).zrem(PRESENCE_INDEX, userId).exec();
  await publish({ kind: "presence", online: await onlineCount(now) });
}

export function queueSize(slug: string): Promise<number> {
  return redis.zcard(queueKey(slug));
}

/** Which games this user is currently queued for, with their enqueue time. */
export async function getPlayerTickets(
  userId: string,
): Promise<{ gameSlug: string; enqueuedAt: number }[]> {
  const pipeline = redis.pipeline();
  for (const game of GAME_CATALOG) pipeline.zscore(queueKey(game.slug), userId);
  const results = await pipeline.exec();

  const tickets: { gameSlug: string; enqueuedAt: number }[] = [];
  results?.forEach(([, score], i) => {
    if (typeof score === "string") {
      tickets.push({ gameSlug: GAME_CATALOG[i].slug, enqueuedAt: Number(score) });
    }
  });
  return tickets;
}

export async function getSnapshot(
  userId: string,
): Promise<Extract<StreamEvent, { kind: "snapshot" }>> {
  const pipeline = redis.pipeline();
  for (const game of GAME_CATALOG) pipeline.zcard(queueKey(game.slug));
  const results = await pipeline.exec();

  const queues: Record<string, number> = {};
  results?.forEach(([, size], i) => {
    queues[GAME_CATALOG[i].slug] = typeof size === "number" ? size : 0;
  });

  return {
    kind: "snapshot",
    queues,
    online: await onlineCount(),
    tickets: await getPlayerTickets(userId),
  };
}

export async function joinQueue(ticket: QueueTicket): Promise<void> {
  const key = queueKey(ticket.gameSlug);
  await redis
    .multi()
    .zadd(key, ticket.enqueuedAt, ticket.userId)
    .hset(ticketKey(ticket.userId, ticket.gameSlug), serializeTicket(ticket))
    .expire(ticketKey(ticket.userId, ticket.gameSlug), TICKET_TTL_SECONDS)
    .exec();

  await touchPresence(ticket.userId, "queued");
  await publish({
    kind: "queue",
    gameSlug: ticket.gameSlug,
    size: await queueSize(ticket.gameSlug),
  });
}

export async function leaveQueue(userId: string, slug: string): Promise<void> {
  await redis.multi().zrem(queueKey(slug), userId).del(ticketKey(userId, slug)).exec();

  const remaining = await getPlayerTickets(userId);
  await touchPresence(userId, remaining.length > 0 ? "queued" : "online");
  await publish({ kind: "queue", gameSlug: slug, size: await queueSize(slug) });
}

export async function leaveAllQueues(userId: string): Promise<void> {
  const tickets = await getPlayerTickets(userId);
  if (tickets.length === 0) return;

  const pipeline = redis.pipeline();
  for (const { gameSlug } of tickets) {
    pipeline.zrem(queueKey(gameSlug), userId);
    pipeline.del(ticketKey(userId, gameSlug));
  }
  await pipeline.exec();

  await touchPresence(userId, "online");
  for (const { gameSlug } of tickets) {
    await publish({ kind: "queue", gameSlug, size: await queueSize(gameSlug) });
  }
}

/** Read a stored ticket back (used by the match worker). */
export async function readTicket(userId: string, slug: string): Promise<QueueTicket | null> {
  const hash = await redis.hgetall(ticketKey(userId, slug));
  return Object.keys(hash).length > 0 ? parseTicket(hash) : null;
}

// --- Match worker surface --------------------------------------------------

/** Every entry currently in a game's queue, oldest first. */
export async function readQueueEntries(
  slug: string,
): Promise<{ userId: string; enqueuedAt: number }[]> {
  const flat = await redis.zrangebyscore(queueKey(slug), "-inf", "+inf", "WITHSCORES");
  const entries: { userId: string; enqueuedAt: number }[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    entries.push({ userId: flat[i], enqueuedAt: Number(flat[i + 1]) });
  }
  return entries;
}

/**
 * Atomically pull a formed group out of the queue. If anyone already left this
 * tick, the ones we did remove are put back and the claim fails — the worker
 * retries them next tick.
 */
export async function claimForMatch(
  entries: { userId: string; enqueuedAt: number }[],
  slug: string,
): Promise<boolean> {
  const pipeline = redis.pipeline();
  for (const entry of entries) pipeline.zrem(queueKey(slug), entry.userId);
  const results = await pipeline.exec();
  const removed = (results ?? []).map(([, n]) => n === 1);

  if (removed.every(Boolean)) {
    const cleanup = redis.pipeline();
    for (const entry of entries) cleanup.del(ticketKey(entry.userId, slug));
    await cleanup.exec();
    return true;
  }

  const restore: string[] = [];
  entries.forEach((entry, i) => {
    if (removed[i]) restore.push(String(entry.enqueuedAt), entry.userId);
  });
  if (restore.length > 0) await redis.zadd(queueKey(slug), ...restore);
  return false;
}

/** Drop queue members whose ticket hash has expired (client vanished). */
export async function pruneStaleEntries(slug: string, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  await redis.zrem(queueKey(slug), ...userIds);
  await publishQueueSize(slug);
}

export async function markInMatch(userIds: string[], now = Date.now()): Promise<void> {
  const pipeline = redis.pipeline();
  for (const userId of userIds) {
    pipeline.set(presenceKey(userId), "in_match", "EX", PRESENCE_TTL_SECONDS);
    pipeline.zadd(PRESENCE_INDEX, now, userId);
  }
  await pipeline.exec();
}

export function publishMatch(
  gameSlug: string,
  matchId: string,
  userIds: string[],
): Promise<number> {
  return publish({ kind: "match", gameSlug, matchId, userIds });
}

export async function publishQueueSize(slug: string): Promise<void> {
  await publish({ kind: "queue", gameSlug: slug, size: await queueSize(slug) });
}
