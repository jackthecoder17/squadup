import { describe, expect, it } from "vitest";

import { getGame, isValidRank, isValidRole } from "./games";
import { isRegion } from "./regions";
import { botEmail, chance, makeBotProfile, mulberry32 } from "./sim-bots";

describe("mulberry32", () => {
  it("is deterministic and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i += 1) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("botEmail", () => {
  it("zero-pads to a stable address", () => {
    expect(botEmail(7)).toBe("bot-0007@squadup.local");
  });
});

describe("makeBotProfile", () => {
  it("is reproducible for the same seed and index", () => {
    expect(makeBotProfile(3, 99)).toEqual(makeBotProfile(3, 99));
  });

  it("varies across indices", () => {
    expect(makeBotProfile(1, 1)).not.toEqual(makeBotProfile(2, 1));
  });

  it("produces a valid, consistent profile", () => {
    for (let i = 0; i < 50; i += 1) {
      const bot = makeBotProfile(i, 7);
      expect(isRegion(bot.region)).toBe(true);
      expect(bot.languages.length).toBeGreaterThanOrEqual(1);
      expect(bot.languages.length).toBeLessThanOrEqual(2);
      expect(bot.games.length).toBeGreaterThanOrEqual(1);
      expect(bot.games.length).toBeLessThanOrEqual(2);
      expect(new Set(bot.games.map((g) => g.slug)).size).toBe(bot.games.length);

      for (const entry of bot.games) {
        expect(getGame(entry.slug)).toBeDefined();
        expect(isValidRank(entry.slug, entry.rank)).toBe(true);
        expect(entry.roles.length).toBeGreaterThanOrEqual(1);
        expect(entry.roles.every((r) => isValidRole(entry.slug, r))).toBe(true);
      }
    }
  });
});

describe("chance", () => {
  it("respects the probability with a fixed rng", () => {
    const rng = mulberry32(1);
    let hits = 0;
    for (let i = 0; i < 1000; i += 1) if (chance(rng, 0.3)) hits += 1;
    expect(hits).toBeGreaterThan(200);
    expect(hits).toBeLessThan(400);
  });
});
