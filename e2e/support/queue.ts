import "dotenv/config";

import Redis from "ioredis";

/** Remove the given test users from every matchmaking key so specs don't bleed. */
export async function flushQueueKeys(userIds: string[]): Promise<void> {
  const redis = new Redis(process.env.REDIS_URL!);
  try {
    const queueKeys = await redis.keys("mm:queue:*");
    for (const key of queueKeys) {
      if (userIds.length > 0) await redis.zrem(key, ...userIds);
    }
    for (const userId of userIds) {
      await redis.del(`mm:presence:${userId}`);
      await redis.zrem("mm:presence:index", userId);
      const ticketKeys = await redis.keys(`mm:ticket:${userId}:*`);
      if (ticketKeys.length > 0) await redis.del(...ticketKeys);
    }
  } finally {
    redis.disconnect();
  }
}
