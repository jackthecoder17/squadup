import { buildTicket } from "@/lib/queue";
import { chance, mulberry32 } from "@/lib/sim-bots";
import { db } from "@/server/db";
import * as queue from "@/server/queue/service";

export type SimConfig = { joinChance: number; leaveChance: number };
export const DEFAULT_SIM_CONFIG: SimConfig = { joinChance: 0.45, leaveChance: 0.02 };

const rng = mulberry32(Date.now() & 0xffff || 1);

export type SimTickResult = { joined: number; left: number; resolved: number };

/** One pass: some idle bots queue, some queued bots bail, all-bot matches auto-resolve. */
export async function simulateTick(
  botIds: string[],
  config: SimConfig = DEFAULT_SIM_CONFIG,
): Promise<SimTickResult> {
  const profiles = await db.playerProfile.findMany({
    where: { userId: { in: botIds } },
    include: { games: { include: { game: { select: { slug: true } } } } },
  });
  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));

  const inMatch = new Set(
    (
      await db.matchPlayer.findMany({
        where: { userId: { in: botIds }, match: { state: { in: ["FORMED", "READY", "LIVE"] } } },
        select: { userId: true },
      })
    ).map((r) => r.userId),
  );

  let joined = 0;
  let left = 0;

  for (const botId of botIds) {
    if (inMatch.has(botId)) continue;
    const profile = profileByUser.get(botId);
    if (!profile) continue;

    const queued = new Set((await queue.getPlayerTickets(botId)).map((t) => t.gameSlug));

    for (const slug of queued) {
      if (chance(rng, config.leaveChance)) {
        await queue.leaveQueue(botId, slug);
        queued.delete(slug);
        left += 1;
      }
    }

    const options = profile.games.map((g) => g.game.slug).filter((slug) => !queued.has(slug));
    if (options.length > 0 && chance(rng, config.joinChance)) {
      const slug = options[Math.floor(rng() * options.length)];
      await queue.joinQueue(
        buildTicket(
          botId,
          { region: profile.region, languages: profile.languages, games: profile.games },
          slug,
        ),
      );
      joined += 1;
    }
  }

  const resolved = await resolveBotMatches(botIds);
  return { joined, left, resolved };
}

/** Complete matches made up entirely of bots, so they churn back into the queue. */
async function resolveBotMatches(botIds: string[]): Promise<number> {
  const botSet = new Set(botIds);
  const matches = await db.match.findMany({
    where: { state: { in: ["FORMED", "READY", "LIVE"] } },
    include: { players: { select: { userId: true } } },
  });

  let resolved = 0;
  for (const match of matches) {
    if (match.players.length === 0) continue;
    if (!match.players.every((p) => botSet.has(p.userId))) continue;

    await db.match.update({ where: { id: match.id }, data: { state: "COMPLETED" } });
    await Promise.all(match.players.map((p) => queue.touchPresence(p.userId, "online")));
    resolved += 1;
  }
  return resolved;
}
