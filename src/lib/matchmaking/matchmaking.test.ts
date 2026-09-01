import { describe, expect, it } from "vitest";

import type { Region } from "../regions";
import { isCompatible, playStyleCompatible, sharedLanguages } from "./candidate";
import type { Candidate, PlayStyle } from "./candidate";
import { allowedRankSpread, allowedRegionDistance, DEFAULT_MATCH_CONFIG } from "./config";
import { formMatches, groupFitScore } from "./form-matches";

const CONFIG = DEFAULT_MATCH_CONFIG;

let seq = 0;
function cand(overrides: Partial<Candidate> = {}): Candidate {
  seq += 1;
  return {
    userId: overrides.userId ?? `u${seq}`,
    region: "EU_WEST" as Region,
    rankIndex: 4,
    roles: ["Mid"],
    languages: ["English"],
    playStyle: "BOTH" as PlayStyle,
    waitedMs: 0,
    ...overrides,
  };
}

describe("primitive compatibility helpers", () => {
  it("playStyleCompatible: BOTH bridges, otherwise must match", () => {
    expect(playStyleCompatible("BOTH", "COMPETITIVE")).toBe(true);
    expect(playStyleCompatible("CASUAL", "CASUAL")).toBe(true);
    expect(playStyleCompatible("CASUAL", "COMPETITIVE")).toBe(false);
  });

  it("sharedLanguages returns the intersection", () => {
    expect(sharedLanguages(["English", "German"], ["German", "French"])).toEqual(["German"]);
    expect(sharedLanguages(["English"], ["French"])).toEqual([]);
  });
});

describe("relaxation curves", () => {
  it("region tolerance widens: same -> adjacent -> any", () => {
    expect(allowedRegionDistance(0, CONFIG)).toBe(0);
    expect(allowedRegionDistance(120_000, CONFIG)).toBe(1);
    expect(allowedRegionDistance(300_000, CONFIG)).toBe(2);
  });

  it("rank spread widens by one tier per step, capped", () => {
    expect(allowedRankSpread(0, CONFIG)).toBe(2);
    expect(allowedRankSpread(60_000, CONFIG)).toBe(3);
    expect(allowedRankSpread(20 * 60_000, CONFIG)).toBe(CONFIG.rankSpreadMax);
  });
});

describe("isCompatible", () => {
  it("rejects a far region until the wait allows it", () => {
    const group = [cand({ region: "EU_WEST" })];
    const far = cand({ region: "ASIA_EAST" });
    expect(isCompatible(group, far, CONFIG)).toBe(false);
    expect(isCompatible(group, { ...far, waitedMs: 300_000 }, CONFIG)).toBe(true);
  });

  it("rejects too wide a rank gap until the wait allows it", () => {
    const group = [cand({ rankIndex: 2 })];
    const smurf = cand({ rankIndex: 6 });
    expect(isCompatible(group, smurf, CONFIG)).toBe(false);
    expect(isCompatible(group, { ...smurf, waitedMs: 5 * 60_000 }, CONFIG)).toBe(true);
  });

  it("rejects a playstyle clash until playStyleRelaxMs", () => {
    const group = [cand({ playStyle: "CASUAL" })];
    const tryhard = cand({ playStyle: "COMPETITIVE" });
    expect(isCompatible(group, tryhard, CONFIG)).toBe(false);
    expect(isCompatible(group, { ...tryhard, waitedMs: CONFIG.playStyleRelaxMs }, CONFIG)).toBe(
      true,
    );
  });

  it("requires a shared language until languageRelaxMs", () => {
    const group = [cand({ languages: ["English"] })];
    const other = cand({ languages: ["Korean"] });
    expect(isCompatible(group, other, CONFIG)).toBe(false);
    expect(isCompatible(group, { ...other, waitedMs: CONFIG.languageRelaxMs }, CONFIG)).toBe(true);
  });
});

describe("groupFitScore", () => {
  it("prefers a candidate that adds a new role", () => {
    const group = [cand({ roles: ["Mid"] })];
    const newRole = cand({ roles: ["Support"] });
    const dupRole = cand({ roles: ["Mid"] });
    expect(groupFitScore(group, newRole, CONFIG)).toBeGreaterThan(
      groupFitScore(group, dupRole, CONFIG),
    );
  });

  it("prefers a candidate closer in rank at equal wait", () => {
    const group = [cand({ rankIndex: 4 })];
    const near = cand({ rankIndex: 4 });
    const far = cand({ rankIndex: 6 });
    expect(groupFitScore(group, near, CONFIG)).toBeGreaterThan(groupFitScore(group, far, CONFIG));
  });
});

describe("formMatches", () => {
  it("returns nothing below the group size", () => {
    expect(formMatches([cand(), cand()], 5, CONFIG)).toEqual([]);
  });

  it("forms one full group and leaves the remainder", () => {
    const pool = Array.from({ length: 7 }, () => cand());
    const groups = formMatches(pool, 5, CONFIG);
    expect(groups).toHaveLength(1);
    expect(groups[0].members).toHaveLength(5);
  });

  it("forms multiple groups without reusing a candidate", () => {
    const pool = Array.from({ length: 10 }, () => cand());
    const groups = formMatches(pool, 5, CONFIG);
    expect(groups).toHaveLength(2);
    const ids = groups.flatMap((g) => g.members.map((m) => m.userId));
    expect(new Set(ids).size).toBe(10);
  });

  it("seeds groups with the longest-waiting player (anti-starvation)", () => {
    const veteran = cand({ userId: "veteran", waitedMs: 400_000 });
    const pool = [veteran, ...Array.from({ length: 8 }, () => cand({ waitedMs: 1_000 }))];
    const groups = formMatches(pool, 5, CONFIG);
    expect(groups[0].members.map((m) => m.userId)).toContain("veteran");
  });

  it("won't cross far regions when nobody has waited", () => {
    const pool = [
      ...Array.from({ length: 3 }, () => cand({ region: "EU_WEST" })),
      ...Array.from({ length: 2 }, () => cand({ region: "ASIA_EAST" })),
    ];
    expect(formMatches(pool, 5, CONFIG)).toEqual([]);
  });

  it("crosses regions once the seed has waited past the 'any region' threshold", () => {
    const pool = [
      cand({ region: "EU_WEST", waitedMs: 300_000 }),
      ...Array.from({ length: 2 }, () => cand({ region: "EU_WEST", waitedMs: 300_000 })),
      ...Array.from({ length: 2 }, () => cand({ region: "ASIA_EAST", waitedMs: 300_000 })),
    ];
    const groups = formMatches(pool, 5, CONFIG);
    expect(groups).toHaveLength(1);
  });

  it("is deterministic for the same input", () => {
    const build = () =>
      Array.from({ length: 12 }, (_, i) =>
        cand({ userId: `p${i}`, rankIndex: 3 + (i % 3), waitedMs: i * 5_000 }),
      );
    const a = formMatches(build(), 5, CONFIG).map((g) => g.members.map((m) => m.userId));
    const b = formMatches(build(), 5, CONFIG).map((g) => g.members.map((m) => m.userId));
    expect(a).toEqual(b);
  });

  it("reports group metadata", () => {
    const pool = [
      cand({ rankIndex: 3, roles: ["Top"], waitedMs: 10_000 }),
      cand({ rankIndex: 4, roles: ["Jungle"] }),
      cand({ rankIndex: 4, roles: ["Mid"] }),
      cand({ rankIndex: 5, roles: ["Bot"] }),
      cand({ rankIndex: 3, roles: ["Support"] }),
    ];
    const [group] = formMatches(pool, 5, CONFIG);
    expect(group.rankSpread).toBe(2);
    expect(group.distinctRoles).toBe(5);
    expect(group.maxWaitedMs).toBe(10_000);
  });
});
