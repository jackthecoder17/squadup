import { Prisma } from "@prisma/client";

import { getGame } from "@/lib/games";
import {
  mergeWindows,
  toNormalizedWindow,
  type NormalizedWindow,
  type TimeWindowInput,
} from "@/lib/availability";
import type { BasicsInput, GameEntryInput, OnboardingInput } from "@/lib/profile-schema";
import { db } from "@/server/db";

const profileInclude = {
  games: { include: { game: true }, orderBy: { createdAt: "asc" } },
  availability: { orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] },
} satisfies Prisma.PlayerProfileInclude;

export type FullProfile = Prisma.PlayerProfileGetPayload<{ include: typeof profileInclude }>;

export function getProfile(userId: string): Promise<FullProfile | null> {
  return db.playerProfile.findUnique({
    where: { userId },
    include: profileInclude,
  });
}

/** Map a catalog slug to its seeded `Game.id`, or throw if the catalog and DB disagree. */
async function gameIdForSlug(slug: string): Promise<string> {
  const game = await db.game.findUnique({ where: { slug }, select: { id: true } });
  if (!game) throw new Error(`Game "${slug}" is in the catalog but not seeded.`);
  return game.id;
}

function normalizeAvailability(windows: TimeWindowInput[]): NormalizedWindow[] {
  return mergeWindows(windows.map(toNormalizedWindow));
}

export async function completeOnboarding(userId: string, input: OnboardingInput) {
  const windows = normalizeAvailability(input.availability);
  const gameIds = await Promise.all(input.games.map((g) => gameIdForSlug(g.gameSlug)));

  await db.$transaction(async (tx) => {
    const profile = await tx.playerProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: input.basics.displayName,
        region: input.basics.region,
        languages: input.basics.languages,
        bio: input.basics.bio || null,
        timezone: input.basics.timezone,
      },
      update: {
        displayName: input.basics.displayName,
        region: input.basics.region,
        languages: input.basics.languages,
        bio: input.basics.bio || null,
        timezone: input.basics.timezone,
      },
    });

    await tx.gameProfile.deleteMany({ where: { profileId: profile.id } });
    await tx.availabilityWindow.deleteMany({ where: { profileId: profile.id } });

    await tx.gameProfile.createMany({
      data: input.games.map((entry, i) => ({
        profileId: profile.id,
        gameId: gameIds[i],
        roles: entry.roles,
        rank: entry.rank,
        playStyle: entry.playStyle,
      })),
    });

    await tx.availabilityWindow.createMany({
      data: windows.map((w) => ({ ...w, profileId: profile.id })),
    });
  });
}

export async function updateBasics(userId: string, input: BasicsInput) {
  await db.playerProfile.update({
    where: { userId },
    data: {
      displayName: input.displayName,
      region: input.region,
      languages: input.languages,
      bio: input.bio || null,
      timezone: input.timezone,
    },
  });
}

export async function upsertGameProfile(userId: string, input: GameEntryInput) {
  const profile = await db.playerProfile.findUniqueOrThrow({
    where: { userId },
    select: { id: true },
  });
  const gameId = await gameIdForSlug(input.gameSlug);

  await db.gameProfile.upsert({
    where: { profileId_gameId: { profileId: profile.id, gameId } },
    create: {
      profileId: profile.id,
      gameId,
      roles: input.roles,
      rank: input.rank,
      playStyle: input.playStyle,
    },
    update: { roles: input.roles, rank: input.rank, playStyle: input.playStyle },
  });
}

export async function replaceGames(userId: string, entries: GameEntryInput[]) {
  const gameIds = await Promise.all(entries.map((e) => gameIdForSlug(e.gameSlug)));
  const profile = await db.playerProfile.findUniqueOrThrow({
    where: { userId },
    select: { id: true },
  });

  await db.$transaction([
    db.gameProfile.deleteMany({ where: { profileId: profile.id } }),
    db.gameProfile.createMany({
      data: entries.map((entry, i) => ({
        profileId: profile.id,
        gameId: gameIds[i],
        roles: entry.roles,
        rank: entry.rank,
        playStyle: entry.playStyle,
      })),
    }),
  ]);
}

export async function removeGameProfile(userId: string, slug: string) {
  const game = getGame(slug);
  if (!game) return;
  const profile = await db.playerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return;
  await db.gameProfile.deleteMany({
    where: { profileId: profile.id, game: { slug } },
  });
}

export async function replaceAvailability(userId: string, windows: TimeWindowInput[]) {
  const normalized = normalizeAvailability(windows);
  const profile = await db.playerProfile.findUniqueOrThrow({
    where: { userId },
    select: { id: true },
  });

  await db.$transaction([
    db.availabilityWindow.deleteMany({ where: { profileId: profile.id } }),
    db.availabilityWindow.createMany({
      data: normalized.map((w) => ({ ...w, profileId: profile.id })),
    }),
  ]);
}
