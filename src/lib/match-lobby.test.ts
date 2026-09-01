import { describe, expect, it } from "vitest";

import {
  allReady,
  canLaunch,
  canLeave,
  isRateable,
  LobbyError,
  MAX_MESSAGE_LENGTH,
  stateAfterReadyChange,
  validateMessage,
} from "./match-lobby";

describe("allReady", () => {
  it("is true only when every player is ready and there is at least one", () => {
    expect(allReady([{ ready: true }, { ready: true }])).toBe(true);
    expect(allReady([{ ready: true }, { ready: false }])).toBe(false);
    expect(allReady([])).toBe(false);
  });
});

describe("stateAfterReadyChange", () => {
  it("locks FORMED to READY when everyone readies up", () => {
    expect(stateAfterReadyChange("FORMED", true)).toBe("READY");
  });

  it("falls READY back to FORMED when someone un-readies", () => {
    expect(stateAfterReadyChange("READY", false)).toBe("FORMED");
  });

  it("leaves other states untouched", () => {
    expect(stateAfterReadyChange("FORMED", false)).toBe("FORMED");
    expect(stateAfterReadyChange("LIVE", true)).toBe("LIVE");
    expect(stateAfterReadyChange("COMPLETED", false)).toBe("COMPLETED");
  });
});

describe("state predicates", () => {
  it("canLeave only before the match goes live", () => {
    expect(canLeave("FORMED")).toBe(true);
    expect(canLeave("READY")).toBe(true);
    expect(canLeave("LIVE")).toBe(false);
    expect(canLeave("COMPLETED")).toBe(false);
  });

  it("canLaunch only from READY", () => {
    expect(canLaunch("READY")).toBe(true);
    expect(canLaunch("FORMED")).toBe(false);
  });

  it("isRateable once the match is live or done", () => {
    expect(isRateable("LIVE")).toBe(true);
    expect(isRateable("COMPLETED")).toBe(true);
    expect(isRateable("READY")).toBe(false);
  });
});

describe("validateMessage", () => {
  it("trims and returns the body", () => {
    expect(validateMessage("  gg wp  ")).toBe("gg wp");
  });

  it("rejects empty and over-long messages", () => {
    expect(() => validateMessage("   ")).toThrow(LobbyError);
    expect(() => validateMessage("x".repeat(MAX_MESSAGE_LENGTH + 1))).toThrow(/under/);
  });
});
