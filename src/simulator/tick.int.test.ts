import { afterAll, afterEach, describe, expect, it } from "vitest";

import { db } from "@/server/db";
import * as queue from "@/server/queue/service";
import { redis } from "@/server/redis";
import { runMatchTick } from "@/worker/tick";

import { buildTicket } from "@/lib/queue";
import * as lobby from "@/server/match/service";

import { ensureBotPool } from "./pool";
import { simulateTick } from "./tick";

describe("simulator (integration)", () => {
  let botIds: string[] = [];
  let humanId: string | null = null;

  afterEach(async () => {
    for (const id of botIds) await queue.leaveAllQueues(id).catch(() => {});
    if (humanId) await queue.leaveAllQueues(humanId).catch(() => {});
    await db.match.deleteMany({
      where: { players: { some: { userId: { in: [...botIds, humanId ?? ""] } } } },
    });
    if (humanId) await db.user.delete({ where: { id: humanId } }).catch(() => {});
    humanId = null;
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

  it("readies the bots when a real player is in the lobby", async () => {
    botIds = await ensureBotPool(30, 11);

    const human = await db.user.create({
      data: { name: "Solo tester", email: `human-${Date.now()}@example.test` },
    });
    humanId = human.id;
    const profile = await db.playerProfile.create({
      data: {
        userId: human.id,
        displayName: "Solo",
        region: "EU_WEST",
        languages: ["English"],
        timezone: "Europe/Berlin",
        games: {
          create: {
            rank: "Gold",
            roles: ["Mid"],
            game: { connect: { slug: "league-of-legends" } },
          },
        },
      },
      include: { games: { include: { game: true } } },
    });

    const base = Date.now();
    await queue.joinQueue(
      buildTicket(
        human.id,
        { region: profile.region, languages: profile.languages, games: profile.games },
        "league-of-legends",
        base - 10 * 60_000, // long wait so the human matches quickly
      ),
    );

    for (let tick = 0; tick < 20; tick += 1) {
      await simulateTick(botIds, { joinChance: 1, leaveChance: 0 });
      await runMatchTick(base + tick * 60_000);
    }

    const humanMatch = await db.match.findFirst({
      where: { players: { some: { userId: human.id } } },
      include: { players: true },
    });
    expect(humanMatch).not.toBeNull();

    // Every bot in the human's lobby is ready; only the human is holding it up.
    const botsInMatch = humanMatch!.players.filter((p) => p.userId !== human.id);
    expect(botsInMatch.length).toBeGreaterThan(0);
    expect(botsInMatch.every((p) => p.ready)).toBe(true);

    // Once the human readies too, the lobby advances with no other people.
    await lobby.setReady(humanMatch!.id, human.id, true);
    const advanced = await db.match.findUniqueOrThrow({ where: { id: humanMatch!.id } });
    expect(advanced.state).toBe("READY");
  });
});
