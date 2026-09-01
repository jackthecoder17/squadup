import { Prisma } from "@prisma/client";

import {
  allReady,
  canLaunch,
  canLeave,
  isRateable,
  LobbyError,
  stateAfterReadyChange,
  validateMessage,
  type MatchState,
} from "@/lib/match-lobby";
import type { MatchStreamEvent } from "@/lib/match-stream";
import { db } from "@/server/db";
import * as presence from "@/server/queue/service";
import { CHANNEL, matchChannel, redis } from "@/server/redis";

const matchInclude = {
  game: true,
  players: {
    orderBy: { waitedMs: "desc" },
    include: {
      user: { select: { name: true, image: true, profile: { select: { displayName: true } } } },
    },
  },
} satisfies Prisma.MatchInclude;

export type FullMatch = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;
export type MatchPlayerView = FullMatch["players"][number];

export type LobbyMessage = {
  id: string;
  userId: string;
  name: string;
  body: string;
  createdAt: string;
};

const ACTIVE_STATES: Prisma.EnumMatchStateFilter["in"] = ["FORMED", "READY", "LIVE"];

// --- Reads ----------------------------------------------------------------

export function getMatch(id: string): Promise<FullMatch | null> {
  return db.match.findUnique({ where: { id }, include: matchInclude });
}

/** The user's current non-terminal match, if any. */
export function getActiveMatchForUser(userId: string): Promise<FullMatch | null> {
  return db.match.findFirst({
    where: { state: { in: ACTIVE_STATES }, players: { some: { userId } } },
    include: matchInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function displayNameFor(player: MatchPlayerView): string {
  return player.user.profile?.displayName ?? player.user.name ?? "Player";
}

export async function getMessages(matchId: string, limit = 100): Promise<LobbyMessage[]> {
  const rows = await db.matchMessage.findMany({
    where: { matchId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, profile: { select: { displayName: true } } } } },
  });
  return rows.reverse().map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.user.profile?.displayName ?? row.user.name ?? "Player",
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getMyRatings(
  matchId: string,
  fromUserId: string,
): Promise<Record<string, number>> {
  const rows = await db.playerRating.findMany({
    where: { matchId, fromUserId },
    select: { toUserId: true, value: true },
  });
  return Object.fromEntries(rows.map((r) => [r.toUserId, r.value]));
}

// --- Lobby mutations ----------------------------------------------------

function publish(matchId: string, event: MatchStreamEvent): Promise<number> {
  return redis.publish(matchChannel(matchId), JSON.stringify(event));
}

async function requirePlayer(matchId: string, userId: string) {
  const player = await db.matchPlayer.findUnique({
    where: { matchId_userId: { matchId, userId } },
    include: { match: { select: { state: true } } },
  });
  if (!player) throw new LobbyError("You're not in this match.");
  return player;
}

export async function sendMessage(matchId: string, userId: string, raw: string): Promise<void> {
  const player = await requirePlayer(matchId, userId);
  if (player.match.state === "CANCELLED") throw new LobbyError("This match was cancelled.");

  const body = validateMessage(raw);
  const message = await db.matchMessage.create({
    data: { matchId, userId, body },
    include: { user: { select: { name: true, profile: { select: { displayName: true } } } } },
  });

  await publish(matchId, {
    kind: "message",
    id: message.id,
    userId,
    name: message.user.profile?.displayName ?? message.user.name ?? "Player",
    body,
    createdAt: message.createdAt.toISOString(),
  });
}

export async function setReady(matchId: string, userId: string, ready: boolean): Promise<void> {
  const player = await requirePlayer(matchId, userId);
  const current = player.match.state as MatchState;
  if (current !== "FORMED" && current !== "READY") {
    throw new LobbyError("Ready state is locked.");
  }

  await db.matchPlayer.update({
    where: { matchId_userId: { matchId, userId } },
    data: { ready },
  });
  await publish(matchId, { kind: "ready", userId, ready });

  const players = await db.matchPlayer.findMany({ where: { matchId }, select: { ready: true } });
  const next = stateAfterReadyChange(current, allReady(players));
  if (next !== current) {
    await db.match.update({ where: { id: matchId }, data: { state: next } });
    await publish(matchId, { kind: "state", state: next });
  }
}

export async function launch(matchId: string, userId: string): Promise<void> {
  const player = await requirePlayer(matchId, userId);
  if (!canLaunch(player.match.state as MatchState)) {
    throw new LobbyError("The match isn't ready to launch.");
  }
  await db.match.update({ where: { id: matchId }, data: { state: "LIVE" } });
  await publish(matchId, { kind: "state", state: "LIVE" });
}

export async function finish(matchId: string, userId: string): Promise<void> {
  const player = await requirePlayer(matchId, userId);
  if (player.match.state !== "LIVE") throw new LobbyError("The match isn't live.");
  await db.match.update({ where: { id: matchId }, data: { state: "COMPLETED" } });
  await publish(matchId, { kind: "state", state: "COMPLETED" });
}

export async function leaveLobby(matchId: string, userId: string): Promise<void> {
  const player = await requirePlayer(matchId, userId);
  if (!canLeave(player.match.state as MatchState)) {
    throw new LobbyError("You can't leave once the match is live.");
  }

  const match = await db.match.update({
    where: { id: matchId },
    data: { state: "CANCELLED" },
    include: { game: { select: { slug: true } }, players: { select: { userId: true } } },
  });
  await publish(matchId, { kind: "state", state: "CANCELLED" });

  const userIds = match.players.map((p) => p.userId);
  await Promise.all(userIds.map((id) => presence.touchPresence(id, "online")));
  await redis.publish(
    CHANNEL,
    JSON.stringify({ kind: "match-cancelled", matchId, gameSlug: match.game.slug, userIds }),
  );
}

export async function rateTeammate(
  matchId: string,
  fromUserId: string,
  toUserId: string,
  value: number,
): Promise<void> {
  if (value !== 1 && value !== -1) throw new LobbyError("Invalid rating.");
  if (fromUserId === toUserId) throw new LobbyError("You can't rate yourself.");

  const from = await requirePlayer(matchId, fromUserId);
  if (!isRateable(from.match.state as MatchState)) {
    throw new LobbyError("You can rate teammates once the match is live.");
  }
  const target = await db.matchPlayer.findUnique({
    where: { matchId_userId: { matchId, userId: toUserId } },
  });
  if (!target) throw new LobbyError("That player isn't in this match.");

  await db.playerRating.upsert({
    where: { matchId_fromUserId_toUserId: { matchId, fromUserId, toUserId } },
    create: { matchId, fromUserId, toUserId, value },
    update: { value },
  });
}
