import { afterAll, afterEach, describe, expect, it } from "vitest";

import { buildTicket } from "@/lib/queue";
import type { Region } from "@/lib/regions";
import { db } from "@/server/db";
import * as queue from "@/server/queue/service";
import { redis } from "@/server/redis";

import { runMatchTick } from "./tick";

const GAME = "valorant";

async function queueUser(
  label: string,
  opts: { region?: Region; rank?: string; waitedMs?: number } = {},
): Promise<string> {
  const tag = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({
    data: { name: `Int ${label}`, email: `int-${tag}@example.test` },
  });
  const profile = await db.playerProfile.create({
    data: {
      userId: user.id,
      displayName: `Int ${label}`,
      region: opts.region ?? "EU_WEST",
      languages: ["English"],
      timezone: "Europe/Berlin",
      games: {
        create: {
          rank: opts.rank ?? "Diamond",
          roles: ["Duelist"],
          playStyle: "BOTH",
          game: { connect: { slug: GAME } },
        },
      },
    },
    include: { games: { include: { game: true } } },
  });

  const enqueuedAt = Date.now() - (opts.waitedMs ?? 0);
  await queue.joinQueue(
    buildTicket(
      user.id,
      { region: profile.region, languages: profile.languages, games: profile.games },
      GAME,
      enqueuedAt,
    ),
  );
  return user.id;
}

describe("runMatchTick (integration)", () => {
  const created: string[] = [];

  afterEach(async () => {
    for (const id of created) {
      await queue.leaveAllQueues(id).catch(() => {});
      await db.user.delete({ where: { id } }).catch(() => {});
    }
    created.length = 0;
    const keys = await redis.keys("mm:*");
    if (keys.length > 0) await redis.del(...keys);
  });

  afterAll(async () => {
    await Promise.allSettled([redis.quit(), db.$disconnect()]);
  });

  it("drains a full lobby into a FORMED match and clears the queue", async () => {
    for (let i = 0; i < 5; i += 1) created.push(await queueUser(`full-${i}`));
    expect((await queue.readQueueEntries(GAME)).length).toBe(5);

    const results = await runMatchTick();
    expect(results.find((r) => r.gameSlug === GAME)?.matchesFormed).toBe(1);
    expect((await queue.readQueueEntries(GAME)).length).toBe(0);

    const match = await db.match.findFirst({
      where: { players: { some: { userId: created[0] } } },
      include: { players: true },
    });
    expect(match?.state).toBe("FORMED");
    expect(match?.players).toHaveLength(5);
    expect(match?.rankSpread).toBe(0);
  });

  it("leaves a lobby below team size untouched", async () => {
    for (let i = 0; i < 3; i += 1) created.push(await queueUser(`partial-${i}`));

    const results = await runMatchTick();
    expect(results.find((r) => r.gameSlug === GAME)?.matchesFormed).toBe(0);
    expect((await queue.readQueueEntries(GAME)).length).toBe(3);
  });

  it("won't group players from far regions until they've waited", async () => {
    for (let i = 0; i < 3; i += 1) created.push(await queueUser(`eu-${i}`, { region: "EU_WEST" }));
    for (let i = 0; i < 2; i += 1)
      created.push(await queueUser(`asia-${i}`, { region: "ASIA_EAST" }));

    // No wait yet — region gate holds, no match.
    expect((await runMatchTick()).find((r) => r.gameSlug === GAME)?.matchesFormed).toBe(0);

    // Everyone has now waited past the "any region" threshold.
    const later = Date.now() + 5 * 60_000;
    expect((await runMatchTick(later)).find((r) => r.gameSlug === GAME)?.matchesFormed).toBe(1);
  });
});
