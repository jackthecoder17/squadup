import { describe, expect, it } from "vitest";

import {
  buildTicket,
  parseTicket,
  QueueError,
  serializeTicket,
  waitLabel,
  type QueueTicket,
} from "./queue";

const profile = {
  region: "EU_WEST",
  languages: ["English", "German"],
  games: [
    {
      game: { slug: "valorant" },
      rank: "Diamond",
      roles: ["Duelist", "IGL"],
      playStyle: "COMPETITIVE",
    },
  ],
};

describe("buildTicket", () => {
  it("builds a ticket from the matching game profile", () => {
    const ticket = buildTicket("user-1", profile, "valorant", 1_000);
    expect(ticket).toMatchObject({
      userId: "user-1",
      gameSlug: "valorant",
      region: "EU_WEST",
      rank: "Diamond",
      roles: ["Duelist", "IGL"],
      playStyle: "COMPETITIVE",
      enqueuedAt: 1_000,
    });
    expect(ticket.rankIndex).toBeGreaterThanOrEqual(0);
  });

  it("throws when the player has no profile for the game", () => {
    expect(() => buildTicket("user-1", profile, "dota-2")).toThrow(QueueError);
  });

  it("throws when the game profile is missing a rank or roles", () => {
    const thin = {
      region: "EU_WEST",
      languages: ["English"],
      games: [{ game: { slug: "valorant" }, rank: "", roles: [], playStyle: "BOTH" }],
    };
    expect(() => buildTicket("user-1", thin, "valorant")).toThrow(/rank and at least one role/i);
  });
});

describe("ticket serialization", () => {
  it("round-trips through the Redis hash form", () => {
    const ticket = buildTicket("user-1", profile, "valorant", 42);
    const restored = parseTicket(serializeTicket(ticket));
    expect(restored).toEqual(ticket);
  });

  it("rejects a hash with no identity", () => {
    expect(() => parseTicket({ region: "EU_WEST" })).toThrow(QueueError);
  });

  it("tolerates a ticket with no roles", () => {
    const hash = serializeTicket({
      userId: "u",
      gameSlug: "valorant",
      region: "EU_WEST",
      rank: "Gold",
      rankIndex: 3,
      roles: [],
      languages: ["English"],
      playStyle: "BOTH",
      enqueuedAt: 1,
    } satisfies QueueTicket);
    expect(parseTicket(hash).roles).toEqual([]);
  });
});

describe("waitLabel", () => {
  it("formats elapsed milliseconds as M:SS", () => {
    expect(waitLabel(0)).toBe("0:00");
    expect(waitLabel(42_000)).toBe("0:42");
    expect(waitLabel(195_000)).toBe("3:15");
  });

  it("clamps negative input", () => {
    expect(waitLabel(-5_000)).toBe("0:00");
  });
});
