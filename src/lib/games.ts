/**
 * The supported-game catalog. This is the source of truth: `prisma/seed.ts`
 * upserts the `Game` table from it, and the UI reads it directly for typed
 * role/rank options. Ranks are ordered lowest → highest.
 */

export type GameDefinition = {
  slug: string;
  name: string;
  shortName: string;
  roles: readonly string[];
  ranks: readonly string[];
};

export const GAME_CATALOG = [
  {
    slug: "league-of-legends",
    name: "League of Legends",
    shortName: "LoL",
    roles: ["Top", "Jungle", "Mid", "Bot", "Support"],
    ranks: [
      "Iron",
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Emerald",
      "Diamond",
      "Master",
      "Grandmaster",
      "Challenger",
    ],
  },
  {
    slug: "valorant",
    name: "VALORANT",
    shortName: "VAL",
    roles: ["Duelist", "Initiator", "Controller", "Sentinel", "Flex", "IGL"],
    ranks: [
      "Iron",
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Diamond",
      "Ascendant",
      "Immortal",
      "Radiant",
    ],
  },
  {
    slug: "counter-strike-2",
    name: "Counter-Strike 2",
    shortName: "CS2",
    roles: ["Entry", "AWPer", "IGL", "Support", "Lurker"],
    ranks: [
      "Silver",
      "Gold Nova",
      "Master Guardian",
      "Distinguished Master Guardian",
      "Legendary Eagle",
      "Supreme",
      "Global Elite",
    ],
  },
  {
    slug: "overwatch-2",
    name: "Overwatch 2",
    shortName: "OW2",
    roles: ["Tank", "DPS", "Support"],
    ranks: ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Champion"],
  },
  {
    slug: "dota-2",
    name: "Dota 2",
    shortName: "Dota",
    roles: ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"],
    ranks: ["Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"],
  },
  {
    slug: "apex-legends",
    name: "Apex Legends",
    shortName: "Apex",
    roles: ["Fragger", "IGL", "Support", "Anchor"],
    ranks: ["Rookie", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Predator"],
  },
  {
    slug: "rocket-league",
    name: "Rocket League",
    shortName: "RL",
    roles: ["Striker", "Midfield", "Defender"],
    ranks: [
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Diamond",
      "Champion",
      "Grand Champion",
      "Supersonic Legend",
    ],
  },
  {
    slug: "marvel-rivals",
    name: "Marvel Rivals",
    shortName: "Rivals",
    roles: ["Vanguard", "Duelist", "Strategist"],
    ranks: [
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Diamond",
      "Grandmaster",
      "Celestial",
      "Eternity",
      "One Above All",
    ],
  },
] as const satisfies readonly GameDefinition[];

export type GameSlug = (typeof GAME_CATALOG)[number]["slug"];

const BY_SLUG = new Map<string, GameDefinition>(GAME_CATALOG.map((g) => [g.slug, g]));

export function getGame(slug: string): GameDefinition | undefined {
  return BY_SLUG.get(slug);
}

export function isGameSlug(slug: string): slug is GameSlug {
  return BY_SLUG.has(slug);
}

export function isValidRole(slug: string, role: string): boolean {
  return getGame(slug)?.roles.includes(role) ?? false;
}

export function isValidRank(slug: string, rank: string): boolean {
  return getGame(slug)?.ranks.includes(rank) ?? false;
}

/** Index of a rank within its game's ladder, or -1. Useful for skill comparisons later. */
export function rankIndex(slug: string, rank: string): number {
  return getGame(slug)?.ranks.indexOf(rank) ?? -1;
}
