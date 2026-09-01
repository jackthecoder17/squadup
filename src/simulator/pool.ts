import { botEmail, makeBotProfile } from "@/lib/sim-bots";
import { db } from "@/server/db";

/**
 * Ensure `count` bot users each have a complete profile. Idempotent and cheap on
 * restart — a bot that already has games is left alone.
 */
export async function ensureBotPool(count: number, seed = 1): Promise<string[]> {
  const ids: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const spec = makeBotProfile(index, seed);
    const user = await db.user.upsert({
      where: { email: botEmail(index) },
      create: { email: botEmail(index), name: spec.displayName, isBot: true },
      update: { isBot: true },
    });
    ids.push(user.id);

    const existing = await db.playerProfile.findUnique({
      where: { userId: user.id },
      include: { games: { select: { id: true } } },
    });
    if (existing && existing.games.length > 0) continue;

    const games = await db.game.findMany({
      where: { slug: { in: spec.games.map((g) => g.slug) } },
      select: { id: true, slug: true },
    });
    const idBySlug = new Map(games.map((g) => [g.slug, g.id]));

    const profile = await db.playerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: spec.displayName,
        region: spec.region,
        languages: spec.languages,
        timezone: spec.timezone,
      },
      update: {
        displayName: spec.displayName,
        region: spec.region,
        languages: spec.languages,
        timezone: spec.timezone,
      },
    });

    await db.$transaction([
      db.gameProfile.deleteMany({ where: { profileId: profile.id } }),
      db.gameProfile.createMany({
        data: spec.games.map((g) => ({
          profileId: profile.id,
          gameId: idBySlug.get(g.slug)!,
          rank: g.rank,
          roles: g.roles,
          playStyle: g.playStyle,
        })),
      }),
      db.availabilityWindow.deleteMany({ where: { profileId: profile.id } }),
      db.availabilityWindow.create({
        data: { profileId: profile.id, dayOfWeek: index % 7, startMinute: 1080, endMinute: 1320 },
      }),
    ]);
  }

  return ids;
}
