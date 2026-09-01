import { db } from "./support/db";

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
