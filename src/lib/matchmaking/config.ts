/**
 * Tunables for the matcher. Every constraint relaxes the longer a player has
 * waited, so a lobby that can't be filled tightly still fills eventually rather
 * than starving anyone.
 */
export type MatchConfig = {
  /** Wait (ms) after which adjacent regions are allowed, then any region. */
  regionRelaxMs: [adjacent: number, any: number];
  /** Base rank-tier spread allowed in a group, and how fast it widens. */
  rankSpreadBase: number;
  rankSpreadStepMs: number;
  rankSpreadMax: number;
  /** Wait (ms) after which CASUAL/COMPETITIVE may be mixed. */
  playStyleRelaxMs: number;
  /** Wait (ms) after which a shared language stops being required. */
  languageRelaxMs: number;
  /** Score weights. */
  weights: {
    roleDiversity: number;
    rankTightness: number;
    regionProximity: number;
    languageOverlap: number;
    playStyleMatch: number;
    waitBonus: number;
  };
};

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  regionRelaxMs: [90_000, 240_000],
  rankSpreadBase: 2,
  rankSpreadStepMs: 45_000,
  rankSpreadMax: 6,
  playStyleRelaxMs: 180_000,
  languageRelaxMs: 120_000,
  weights: {
    roleDiversity: 3,
    rankTightness: 2,
    regionProximity: 2,
    languageOverlap: 1.5,
    playStyleMatch: 1,
    waitBonus: 0.001, // per ms, i.e. ~1 per second waited
  },
};

/** Max region distance (0/1/2) tolerated at a given wait. */
export function allowedRegionDistance(waitMs: number, config: MatchConfig): 0 | 1 | 2 {
  const [adjacentAt, anyAt] = config.regionRelaxMs;
  if (waitMs >= anyAt) return 2;
  if (waitMs >= adjacentAt) return 1;
  return 0;
}

/** Max rank-tier spread tolerated across a group at a given wait. */
export function allowedRankSpread(waitMs: number, config: MatchConfig): number {
  const widened = config.rankSpreadBase + Math.floor(waitMs / config.rankSpreadStepMs);
  return Math.min(config.rankSpreadMax, widened);
}
