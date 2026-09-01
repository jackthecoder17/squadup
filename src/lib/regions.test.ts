import { describe, expect, it } from "vitest";

import { isRegion, regionDistance, regionLabel, REGION_KEYS } from "./regions";

describe("regionDistance", () => {
  it("is 0 for the same region", () => {
    expect(regionDistance("EU_WEST", "EU_WEST")).toBe(0);
  });

  it("is 1 for adjacent regions, symmetrically", () => {
    expect(regionDistance("EU_WEST", "EU_EAST")).toBe(1);
    expect(regionDistance("EU_EAST", "EU_WEST")).toBe(1);
    expect(regionDistance("NA_EAST", "SA")).toBe(1);
  });

  it("is 2 for far regions", () => {
    expect(regionDistance("NA_EAST", "ASIA_EAST")).toBe(2);
    expect(regionDistance("OCEANIA", "AFRICA")).toBe(2);
  });
});

describe("region helpers", () => {
  it("labels every key and round-trips the guard", () => {
    for (const key of REGION_KEYS) {
      expect(regionLabel(key)).toBeTruthy();
      expect(isRegion(key)).toBe(true);
    }
    expect(isRegion("MOON")).toBe(false);
  });
});
