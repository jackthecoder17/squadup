import "dotenv/config";

import Redis from "ioredis";

import { db } from "./db";

/** Start every Playwright run from a clean shared queue and no test leftovers. */
export default async function globalSetup() {
  const redis = new Redis(process.env.REDIS_URL!);
  const keys = await redis.keys("mm:*");
  if (keys.length > 0) await redis.del(...keys);
  redis.disconnect();

  await db.playerRating.deleteMany({
    where: { fromUser: { email: { contains: "@example.test" } } },
  });
  await db.match.deleteMany({
    where: { players: { some: { user: { email: { contains: "@example.test" } } } } },
  });
  await db.match.deleteMany({ where: { players: { none: {} } } });
  await db.user.deleteMany({
    where: { OR: [{ email: { contains: "@example.test" } }, { isBot: true }] },
  });
  await db.$disconnect();
}
