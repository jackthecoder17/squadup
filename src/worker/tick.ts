import { GAME_CATALOG, type GameDefinition } from "@/lib/games";
import { DEFAULT_MATCH_CONFIG, formMatches, type Candidate } from "@/lib/matchmaking";
import type { QueueTicket } from "@/lib/queue";
import type { Region } from "@/lib/regions";
import { db } from "@/server/db";
import {
  claimForMatch,
  markInMatch,
  pruneStaleEntries,
  publishMatch,
  publishQueueSize,
  readQueueEntries,
  readTicket,
} from "@/server/queue/service";

export type GameTickResult = { gameSlug: string; matchesFormed: number };

/** One pass over every game's queue. Safe to call on an interval. */
export async function runMatchTick(now = Date.now()): Promise<GameTickResult[]> {
  const results: GameTickResult[] = [];
  for (const game of GAME_CATALOG) {
    results.push({ gameSlug: game.slug, matchesFormed: await matchGame(game, now) });
  }
  return results;
}

async function matchGame(game: GameDefinition, now: number): Promise<number> {
  const entries = await readQueueEntries(game.slug);
  if (entries.length < game.teamSize) return 0;

  const tickets = new Map<string, QueueTicket>();
  const candidates: Candidate[] = [];
  const stale: string[] = [];
  for (const { userId, enqueuedAt } of entries) {
    const ticket = await readTicket(userId, game.slug);
    if (!ticket) {
      stale.push(userId); // ticket TTL'd out — client vanished without leaving
      continue;
    }
    tickets.set(userId, ticket);
    candidates.push({
      userId,
      region: ticket.region as Region,
      rankIndex: ticket.rankIndex,
      roles: ticket.roles,
      languages: ticket.languages,
      playStyle: ticket.playStyle,
      waitedMs: Math.max(0, now - enqueuedAt),
    });
  }
  await pruneStaleEntries(game.slug, stale);
  if (candidates.length < game.teamSize) return 0;

  const groups = formMatches(candidates, game.teamSize, DEFAULT_MATCH_CONFIG);
  if (groups.length === 0) return 0;

  const gameRow = await db.game.findUniqueOrThrow({
    where: { slug: game.slug },
    select: { id: true },
  });

  let formed = 0;
  for (const group of groups) {
    const memberEntries = group.members.map((m) => ({
      userId: m.userId,
      enqueuedAt: tickets.get(m.userId)!.enqueuedAt,
    }));

    const claimed = await claimForMatch(memberEntries, game.slug);
    if (!claimed) continue; // someone bailed mid-tick — retry next tick

    const userIds = group.members.map((m) => m.userId);
    const match = await db.match.create({
      data: {
        gameId: gameRow.id,
        region: group.region as Region,
        rankSpread: group.rankSpread,
        players: {
          create: group.members.map((m) => ({
            userId: m.userId,
            rank: tickets.get(m.userId)!.rank,
            roles: tickets.get(m.userId)!.roles,
            waitedMs: m.waitedMs,
          })),
        },
      },
    });

    await markInMatch(userIds, now);
    await publishMatch(game.slug, match.id, userIds);
    await publishQueueSize(game.slug);
    formed += 1;
  }

  return formed;
}
