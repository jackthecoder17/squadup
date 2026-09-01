import { regionDistance, type Region } from "../regions";
import { allowedRankSpread, allowedRegionDistance, type MatchConfig } from "./config";

export type PlayStyle = "CASUAL" | "COMPETITIVE" | "BOTH";

export type Candidate = {
  userId: string;
  region: Region;
  rankIndex: number;
  roles: string[];
  languages: string[];
  playStyle: PlayStyle;
  /** ms this candidate has been in the queue. */
  waitedMs: number;
};

/** BOTH pairs with anything; otherwise the styles must match. */
export function playStyleCompatible(a: PlayStyle, b: PlayStyle): boolean {
  return a === "BOTH" || b === "BOTH" || a === b;
}

export function sharedLanguages(a: string[], b: string[]): string[] {
  const set = new Set(a);
  return b.filter((lang) => set.has(lang));
}

/** The relaxation level for a pair/group is driven by its most-patient member. */
export function groupWait(candidates: Candidate[]): number {
  return candidates.reduce((max, c) => Math.max(max, c.waitedMs), 0);
}

/**
 * Can `candidate` be added to `group` under the constraints, relaxed by the
 * longest wait among all of them?
 */
export function isCompatible(
  group: Candidate[],
  candidate: Candidate,
  config: MatchConfig,
): boolean {
  const all = [...group, candidate];
  const wait = groupWait(all);

  const maxRegionDistance = allowedRegionDistance(wait, config);
  for (const member of group) {
    if (regionDistance(member.region, candidate.region) > maxRegionDistance) return false;
  }

  const ranks = all.map((c) => c.rankIndex);
  if (Math.max(...ranks) - Math.min(...ranks) > allowedRankSpread(wait, config)) return false;

  if (wait < config.playStyleRelaxMs) {
    for (const member of group) {
      if (!playStyleCompatible(member.playStyle, candidate.playStyle)) return false;
    }
  }

  if (wait < config.languageRelaxMs) {
    // Every member must still share at least one language with the candidate.
    for (const member of group) {
      if (sharedLanguages(member.languages, candidate.languages).length === 0) return false;
    }
  }

  return true;
}
