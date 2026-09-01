import type { PlayStyle } from "@/lib/profile-schema";
import type { Region } from "@/lib/regions";

export type GameDraft = {
  slug: string;
  roles: string[];
  rank: string;
  playStyle: PlayStyle;
};

export type WindowDraft = {
  id: string;
  dayOfWeek: number;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
};

export type WizardData = {
  displayName: string;
  region: Region | "";
  languages: string[];
  bio: string;
  timezone: string;
  games: GameDraft[];
  windows: WindowDraft[];
};

export const EMPTY_WIZARD: WizardData = {
  displayName: "",
  region: "",
  languages: [],
  bio: "",
  timezone: "",
  games: [],
  windows: [],
};

export type OnboardingPayload = {
  basics: {
    displayName: string;
    region: string;
    languages: string[];
    bio?: string;
    timezone: string;
  };
  games: { gameSlug: string; roles: string[]; rank: string; playStyle: PlayStyle }[];
  availability: { dayOfWeek: number; start: string; end: string }[];
};

export function toPayload(data: WizardData): OnboardingPayload {
  return {
    basics: {
      displayName: data.displayName.trim(),
      region: data.region,
      languages: data.languages,
      bio: data.bio.trim() || undefined,
      timezone: data.timezone,
    },
    games: data.games.map((g) => ({
      gameSlug: g.slug,
      roles: g.roles,
      rank: g.rank,
      playStyle: g.playStyle,
    })),
    availability: data.windows.map((w) => ({
      dayOfWeek: w.dayOfWeek,
      start: w.start,
      end: w.end,
    })),
  };
}
