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
