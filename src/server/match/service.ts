import { Prisma } from "@prisma/client";

import { db } from "@/server/db";

const matchInclude = {
  game: true,
  players: {
    include: {
      user: { select: { name: true, image: true, profile: { select: { displayName: true } } } },
    },
  },
} satisfies Prisma.MatchInclude;

export type FullMatch = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;

const ACTIVE_STATES: Prisma.EnumMatchStateFilter["in"] = ["FORMED", "READY", "LIVE"];

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

export function displayNameFor(player: FullMatch["players"][number]): string {
  return player.user.profile?.displayName ?? player.user.name ?? "Player";
}
