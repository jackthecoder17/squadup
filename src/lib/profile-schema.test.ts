import { describe, expect, it } from "vitest";

import { gameEntrySchema, onboardingSchema } from "./profile-schema";

const validOnboarding = {
  basics: {
    displayName: "Nova",
    region: "EU_WEST",
    languages: ["English", "German"],
    timezone: "Europe/Berlin",
  },
  games: [
    { gameSlug: "valorant", roles: ["Duelist", "IGL"], rank: "Diamond", playStyle: "COMPETITIVE" },
  ],
  availability: [{ dayOfWeek: 3, start: "18:00", end: "22:30" }],
};

describe("gameEntrySchema", () => {
  it("accepts a valid entry", () => {
    expect(gameEntrySchema.safeParse(validOnboarding.games[0]).success).toBe(true);
  });

  it("rejects an unknown game", () => {
    const result = gameEntrySchema.safeParse({
      ...validOnboarding.games[0],
      gameSlug: "pong",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a role that doesn't belong to the game", () => {
    const result = gameEntrySchema.safeParse({
      ...validOnboarding.games[0],
      roles: ["Top"], // League role, not Valorant
    });
    expect(result.success).toBe(false);
  });

  it("rejects a rank from another game's ladder", () => {
    const result = gameEntrySchema.safeParse({
      ...validOnboarding.games[0],
      rank: "Challenger",
    });
    expect(result.success).toBe(false);
  });
});

describe("onboardingSchema", () => {
  it("accepts a well-formed payload", () => {
    expect(onboardingSchema.safeParse(validOnboarding).success).toBe(true);
  });

  it("trims and length-checks the display name", () => {
    const short = onboardingSchema.safeParse({
      ...validOnboarding,
      basics: { ...validOnboarding.basics, displayName: "x" },
    });
    expect(short.success).toBe(false);
  });

  it("requires at least one game", () => {
    const result = onboardingSchema.safeParse({ ...validOnboarding, games: [] });
    expect(result.success).toBe(false);
  });

  it("rejects the same game added twice", () => {
    const result = onboardingSchema.safeParse({
      ...validOnboarding,
      games: [validOnboarding.games[0], validOnboarding.games[0]],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a window whose end precedes its start", () => {
    const result = onboardingSchema.safeParse({
      ...validOnboarding,
      availability: [{ dayOfWeek: 3, start: "22:00", end: "18:00" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid timezone", () => {
    const result = onboardingSchema.safeParse({
      ...validOnboarding,
      basics: { ...validOnboarding.basics, timezone: "Mars/Olympus" },
    });
    expect(result.success).toBe(false);
  });
});
