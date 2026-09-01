import { afterAll, afterEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import * as queue from "@/server/queue/service";
import { redis } from "@/server/redis";
import { runMatchTick } from "@/worker/tick";

import { ensureBotPool } from "./pool";
import { simulateTick } from "./tick";

describe("simulator (integration)", () => {
  let botIds: string[] = [];

  afterEach(async () => {
    for (const id of botIds) await queue.leaveAllQueues(id).catch(() => {});
    await db.match.deleteMany({ where: { players: { some: { userId: { in: botIds } } } } });
    const keys = await redis.keys("mm:*");
    if (keys.length > 0) await redis.del(...keys);
  });

  afterAll(async () => {
    await db.match.deleteMany({ where: { players: { none: {} } } });
    await db.user.deleteMany({ where: { isBot: true } });
    await Promise.allSettled([redis.quit(), db.$disconnect()]);
  });

  it("ensures a pool of bots with complete profiles", async () => {
    botIds = await ensureBotPool(6, 123);
    expect(botIds).toHaveLength(6);

    const profiles = await db.playerProfile.findMany({
      where: { userId: { in: botIds } },
      include: { games: true, availability: true },
    });
    expect(profiles).toHaveLength(6);
    for (const profile of profiles) {
      expect(profile.games.length).toBeGreaterThan(0);
      expect(profile.availability.length).toBeGreaterThan(0);
    }
  });

  it("fills queues, forms all-bot matches, and resolves them back to idle", async () => {
    botIds = await ensureBotPool(40, 7);

    // Advance the clock each tick so wait-time relaxation lets groups form
    // despite the bots' spread of regions and ranks.
    const base = Date.now();
    for (let tick = 0; tick < 25; tick += 1) {
      await simulateTick(botIds, { joinChance: 1, leaveChance: 0 });
      await runMatchTick(base + tick * 60_000);
    }

    const matches = await db.match.findMany({
      where: { players: { some: { userId: { in: botIds } } } },
    });
    expect(matches.length).toBeGreaterThan(0);
    // resolveBotMatches (run inside simulateTick) completes all-bot lobbies
    expect(matches.some((m) => m.state === "COMPLETED")).toBe(true);
  });
});
