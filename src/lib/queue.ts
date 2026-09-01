import { rankIndex } from "./games";

export const PRESENCE_TTL_SECONDS = 45;
export const PRESENCE_REFRESH_MS = 20_000;
/** Safety expiry on a queue ticket if a client vanishes without leaving. */
export const TICKET_TTL_SECONDS = 30 * 60;

export type PlayStyle = "CASUAL" | "COMPETITIVE" | "BOTH";

export type QueueTicket = {
  userId: string;
  gameSlug: string;
  region: string;
  rank: string;
  rankIndex: number;
  roles: string[];
  languages: string[];
  playStyle: PlayStyle;
  enqueuedAt: number;
};

export class QueueError extends Error {}

type ProfileForTicket = {
  region: string;
  languages: string[];
  games: {
    game: { slug: string };
    rank: string;
    roles: string[];
    playStyle: string;
  }[];
};

/** Assemble a queue ticket from the player's stored profile for one game. */
export function buildTicket(
  userId: string,
  profile: ProfileForTicket,
  gameSlug: string,
  now = Date.now(),
): QueueTicket {
  const entry = profile.games.find((g) => g.game.slug === gameSlug);
  if (!entry) {
    throw new QueueError("You don't have a profile for that game yet.");
  }
  if (entry.roles.length === 0 || !entry.rank) {
    throw new QueueError("Add a rank and at least one role for that game first.");
  }

  return {
    userId,
    gameSlug,
    region: profile.region,
    rank: entry.rank,
    rankIndex: rankIndex(gameSlug, entry.rank),
    roles: entry.roles,
    languages: profile.languages,
    playStyle: entry.playStyle as PlayStyle,
    enqueuedAt: now,
  };
}

export function serializeTicket(ticket: QueueTicket): Record<string, string> {
  return {
    userId: ticket.userId,
    gameSlug: ticket.gameSlug,
    region: ticket.region,
    rank: ticket.rank,
    rankIndex: String(ticket.rankIndex),
    roles: ticket.roles.join(","),
    languages: ticket.languages.join(","),
    playStyle: ticket.playStyle,
    enqueuedAt: String(ticket.enqueuedAt),
  };
}

export function parseTicket(hash: Record<string, string>): QueueTicket {
  if (!hash.userId || !hash.gameSlug) {
    throw new QueueError("Malformed queue ticket.");
  }
  return {
    userId: hash.userId,
    gameSlug: hash.gameSlug,
    region: hash.region ?? "",
    rank: hash.rank ?? "",
    rankIndex: Number(hash.rankIndex ?? "-1"),
    roles: hash.roles ? hash.roles.split(",") : [],
    languages: hash.languages ? hash.languages.split(",") : [],
    playStyle: (hash.playStyle as PlayStyle) ?? "BOTH",
    enqueuedAt: Number(hash.enqueuedAt ?? "0"),
  };
}

/** Elapsed time as "M:SS". Negative input clamps to 0:00. */
export function waitLabel(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
