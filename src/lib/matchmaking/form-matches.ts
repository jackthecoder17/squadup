import type { Region } from "../regions";
import { regionDistance } from "../regions";
import { isCompatible, sharedLanguages, type Candidate } from "./candidate";
import { DEFAULT_MATCH_CONFIG, type MatchConfig } from "./config";

export type MatchGroup = {
  members: Candidate[];
  region: Region;
  rankSpread: number;
  distinctRoles: number;
  maxWaitedMs: number;
};

function distinctRoleCount(candidates: Candidate[]): number {
  return new Set(candidates.flatMap((c) => c.roles)).size;
}

function rankSpread(candidates: Candidate[]): number {
  const ranks = candidates.map((c) => c.rankIndex);
  return Math.max(...ranks) - Math.min(...ranks);
}

/** How good an addition `candidate` is to the forming `group`. Higher is better. */
export function groupFitScore(
  group: Candidate[],
  candidate: Candidate,
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
): number {
  const w = config.weights;
  const withCandidate = [...group, candidate];

  const roleGain = distinctRoleCount(withCandidate) - distinctRoleCount(group);
  const spreadIncrease = rankSpread(withCandidate) - rankSpread(group);
  const regionPenalty =
    group.reduce((sum, m) => sum + regionDistance(m.region, candidate.region), 0) /
    Math.max(1, group.length);
  const languageOverlap = Math.min(
    ...group.map((m) => sharedLanguages(m.languages, candidate.languages).length),
  );
  const styleMatches = group.filter(
    (m) => m.playStyle === candidate.playStyle && m.playStyle !== "BOTH",
  ).length;

  return (
    roleGain * w.roleDiversity -
    spreadIncrease * w.rankTightness -
    regionPenalty * w.regionProximity +
    (Number.isFinite(languageOverlap) ? languageOverlap : 0) * w.languageOverlap +
    styleMatches * w.playStyleMatch +
    candidate.waitedMs * w.waitBonus
  );
}

function byPatienceThenId(a: Candidate, b: Candidate): number {
  return b.waitedMs - a.waitedMs || a.userId.localeCompare(b.userId);
}

/**
 * Greedy seed-and-grow. Longest-waiting players seed groups first (anti-
 * starvation); each group grows by repeatedly adding the highest-scoring
 * compatible candidate. A seed that can't be filled this tick is left for the
 * next one, by which point its constraints have relaxed further.
 */
export function formMatches(
  candidates: Candidate[],
  groupSize: number,
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
): MatchGroup[] {
  if (groupSize < 1 || candidates.length < groupSize) return [];

  const ordered = [...candidates].sort(byPatienceThenId);
  const used = new Set<string>();
  const groups: MatchGroup[] = [];

  for (const seed of ordered) {
    if (used.has(seed.userId)) continue;

    const group: Candidate[] = [seed];
    while (group.length < groupSize) {
      let best: Candidate | null = null;
      let bestScore = -Infinity;

      for (const candidate of ordered) {
        if (used.has(candidate.userId) || group.includes(candidate)) continue;
        if (!isCompatible(group, candidate, config)) continue;

        const score = groupFitScore(group, candidate, config);
        if (
          score > bestScore ||
          (score === bestScore && best !== null && byPatienceThenId(candidate, best) < 0)
        ) {
          best = candidate;
          bestScore = score;
        }
      }

      if (!best) break;
      group.push(best);
    }

    if (group.length === groupSize) {
      for (const member of group) used.add(member.userId);
      groups.push({
        members: group,
        region: seed.region,
        rankSpread: rankSpread(group),
        distinctRoles: distinctRoleCount(group),
        maxWaitedMs: Math.max(...group.map((m) => m.waitedMs)),
      });
    }
  }

  return groups;
}
