/** Server regions players queue in. Keys match the Prisma `Region` enum. */
export const REGIONS = {
  NA_EAST: "NA East",
  NA_WEST: "NA West",
  SA: "South America",
  EU_WEST: "EU West",
  EU_EAST: "EU East",
  MENA: "Middle East / North Africa",
  AFRICA: "Africa (Sub-Saharan)",
  ASIA_EAST: "East Asia",
  ASIA_SE: "Southeast Asia",
  OCEANIA: "Oceania",
} as const;

export type Region = keyof typeof REGIONS;

export const REGION_KEYS = Object.keys(REGIONS) as Region[];

export function isRegion(value: string): value is Region {
  return value in REGIONS;
}

export function regionLabel(region: Region): string {
  return REGIONS[region];
}

/**
 * Regions that share a plausible low-latency bridge. Matchmaking widens from
 * "same region only" to "distance <= 1" to "anywhere" as a player waits.
 */
const ADJACENT: readonly [Region, Region][] = [
  ["NA_EAST", "NA_WEST"],
  ["NA_EAST", "SA"],
  ["NA_WEST", "OCEANIA"],
  ["EU_WEST", "EU_EAST"],
  ["EU_WEST", "MENA"],
  ["EU_EAST", "MENA"],
  ["MENA", "AFRICA"],
  ["ASIA_EAST", "ASIA_SE"],
  ["ASIA_SE", "OCEANIA"],
];

const ADJACENCY = new Set(ADJACENT.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));

/** 0 = same region, 1 = adjacent, 2 = far. */
export function regionDistance(a: Region, b: Region): 0 | 1 | 2 {
  if (a === b) return 0;
  return ADJACENCY.has(`${a}|${b}`) ? 1 : 2;
}
