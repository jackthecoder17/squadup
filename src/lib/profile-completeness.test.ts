import { describe, expect, it } from "vitest";

import { isProfileComplete, missingProfileRequirements } from "./profile-completeness";

const complete = {
  displayName: "Nova",
  region: "EU_WEST",
  languages: ["English"],
  games: [{ rank: "Gold", roles: ["Mid"] }],
  availability: [{ dayOfWeek: 3, startMinute: 1080, endMinute: 1350 }],
};

describe("missingProfileRequirements", () => {
  it("returns nothing for a complete profile", () => {
    expect(missingProfileRequirements(complete)).toEqual([]);
    expect(isProfileComplete(complete)).toBe(true);
  });

  it("flags a null profile", () => {
    expect(missingProfileRequirements(null)).toEqual(["a profile"]);
    expect(isProfileComplete(undefined)).toBe(false);
  });

  it("flags each missing identity field", () => {
    expect(missingProfileRequirements({ ...complete, displayName: "  " })).toContain(
      "a display name",
    );
    expect(missingProfileRequirements({ ...complete, region: null })).toContain("a region");
    expect(missingProfileRequirements({ ...complete, languages: [] })).toContain("a language");
  });

  it("requires a game that has both a rank and a role", () => {
    expect(missingProfileRequirements({ ...complete, games: [] })).toContain(
      "a game with a rank and role",
    );
    expect(
      missingProfileRequirements({ ...complete, games: [{ rank: "Gold", roles: [] }] }),
    ).toContain("a game with a rank and role");
    expect(
      missingProfileRequirements({ ...complete, games: [{ rank: null, roles: ["Mid"] }] }),
    ).toContain("a game with a rank and role");
  });

  it("requires at least one availability window", () => {
    expect(missingProfileRequirements({ ...complete, availability: [] })).toContain(
      "an availability window",
    );
  });
});
