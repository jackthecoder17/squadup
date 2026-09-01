import { db } from "./support/db";

/** Insert a formed Match with the given users as players. */
export async function seedMatch(userIds: string[], gameSlug = "valorant"): Promise<string> {
  const game = await db.game.findUniqueOrThrow({ where: { slug: gameSlug } });
  const match = await db.match.create({
    data: {
      gameId: game.id,
      region: "EU_WEST",
      rankSpread: 0,
      players: {
        create: userIds.map((userId, i) => ({
          userId,
          rank: "Diamond",
          roles: ["Duelist"],
          waitedMs: 30_000 + i * 1_000,
        })),
      },
    },
  });
  return match.id;
}

/** Insert a queue-ready profile for `userId` (VALORANT / Diamond / Duelist). */
export async function seedCompleteProfile(userId: string, displayName: string): Promise<void> {
  await db.playerProfile.create({
    data: {
      userId,
      displayName,
      region: "EU_WEST",
      languages: ["English"],
      timezone: "Europe/Berlin",
      games: {
        create: {
          rank: "Diamond",
          roles: ["Duelist"],
          game: { connect: { slug: "valorant" } },
        },
      },
      availability: { create: { dayOfWeek: 3, startMinute: 1080, endMinute: 1320 } },
    },
  });
}
