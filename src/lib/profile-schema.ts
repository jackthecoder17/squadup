import { z } from "zod";

import { GAME_CATALOG, isGameSlug, isValidRank, isValidRole } from "./games";
import { isLanguage, type Language } from "./languages";
import { isRegion, type Region } from "./regions";
import { isValidTimeZone } from "./time-zone";

const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;

export const regionSchema = z.custom<Region>((v) => typeof v === "string" && isRegion(v), {
  message: "Choose a region.",
});

export const languageSchema = z.custom<Language>((v) => typeof v === "string" && isLanguage(v), {
  message: "Unknown language.",
});

export const PLAY_STYLES = ["CASUAL", "COMPETITIVE", "BOTH"] as const;
export type PlayStyle = (typeof PLAY_STYLES)[number];

export const basicsSchema = z.object({
  displayName: z.string().trim().min(2, "At least 2 characters.").max(32, "At most 32 characters."),
  region: regionSchema,
  languages: z
    .array(languageSchema)
    .min(1, "Pick at least one language.")
    .max(5, "At most 5 languages."),
  bio: z.string().trim().max(280, "At most 280 characters.").optional(),
  timezone: z.string().refine(isValidTimeZone, "Unrecognised timezone."),
});
export type BasicsInput = z.infer<typeof basicsSchema>;

export const gameEntrySchema = z
  .object({
    gameSlug: z.string(),
    roles: z.array(z.string()).min(1, "Pick at least one role.").max(5, "At most 5 roles."),
    rank: z.string().min(1, "Select your rank."),
    playStyle: z.enum(PLAY_STYLES),
  })
  .refine((v) => isGameSlug(v.gameSlug), { message: "Unknown game.", path: ["gameSlug"] })
  .refine((v) => v.roles.every((r) => isValidRole(v.gameSlug, r)), {
    message: "Role not valid for this game.",
    path: ["roles"],
  })
  .refine((v) => isValidRank(v.gameSlug, v.rank), {
    message: "Rank not valid for this game.",
    path: ["rank"],
  });
export type GameEntryInput = z.infer<typeof gameEntrySchema>;

export const timeWindowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    start: z.string().regex(HHMM, "Use HH:MM."),
    end: z.string().regex(HHMM, "Use HH:MM."),
  })
  .refine((v) => v.start < v.end, {
    message: "End must be after start.",
    path: ["end"],
  });
export type TimeWindowFormInput = z.infer<typeof timeWindowSchema>;

export const availabilitySchema = z
  .array(timeWindowSchema)
  .min(1, "Add at least one availability window.")
  .max(20, "That's a lot of windows — cap is 20.");

export const gamesSchema = z
  .array(gameEntrySchema)
  .min(1, "Keep at least one game.")
  .max(GAME_CATALOG.length, "That's every game we support.")
  .refine((games) => new Set(games.map((g) => g.gameSlug)).size === games.length, {
    message: "You've added the same game twice.",
  });

export const onboardingSchema = z
  .object({
    basics: basicsSchema,
    games: z
      .array(gameEntrySchema)
      .min(1, "Add at least one game.")
      .max(GAME_CATALOG.length, "That's every game we support."),
    availability: availabilitySchema,
  })
  .refine((v) => new Set(v.games.map((g) => g.gameSlug)).size === v.games.length, {
    message: "You've added the same game twice.",
    path: ["games"],
  });
export type OnboardingInput = z.infer<typeof onboardingSchema>;
