import Redis from "ioredis";

import { env } from "@/env";

const createRedis = () =>
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

/** Shared command connection. Reused across HMR reloads in dev. */
export const redis = globalForRedis.redis ?? createRedis();

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

/**
 * A dedicated connection for `SUBSCRIBE`. ioredis puts a connection into
 * subscriber mode exclusively, so pub/sub consumers (the SSE route) each need
 * their own, closed when the consumer goes away.
 */
export function createRedisSubscriber(): Redis {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

export const CHANNEL = "mm:events";
