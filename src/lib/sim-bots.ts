import { GAME_CATALOG, getGame } from "./games";
import { LANGUAGES } from "./languages";
import type { PlayStyle } from "./queue";
import { REGION_KEYS, type Region } from "./regions";

/** Deterministic PRNG (mulberry32) so a seed reproduces the same bot pool. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

const pick = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

/** Pick from `arr` where `weights[i]` is the relative chance of `arr[i]`. */
function pickWeighted<T>(rng: Rng, arr: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < arr.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return arr[i];
  }
  return arr[arr.length - 1];
}

/** A rank drawn from a bell around the middle of the ladder — a realistic pool
 * is dense in the mid ranks, not uniform, which lets tight lobbies form fast. */
function centeredRank(rng: Rng, ranks: readonly string[]): string {
  const mid = (ranks.length - 1) / 2;
  const spread = (rng() + rng() + rng() - 1.5) * (ranks.length * 0.28);
  const index = Math.min(ranks.length - 1, Math.max(0, Math.round(mid + spread)));
  return ranks[index];
}

function sampleN<T>(rng: Rng, arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

const HANDLE_PARTS = [
  "night",
  "storm",
  "ghost",
  "ace",
  "volt",
  "iron",
  "nova",
  "rift",
  "echo",
  "frost",
  "blaze",
  "zen",
];

const PLAY_STYLE_BAG: PlayStyle[] = ["CASUAL", "COMPETITIVE", "BOTH", "BOTH"];

// Weights over REGION_KEYS / GAME_CATALOG order — a clustered population so the
// simulated queues actually reach team size, the way a real player base would.
const REGION_WEIGHTS = [6, 3, 1, 6, 3, 1, 0.5, 3, 4, 1];
const GAME_WEIGHTS = [8, 8, 4, 3, 1.5, 1.5, 1.5, 2];

export type BotGameEntry = {
  slug: string;
  rank: string;
  roles: string[];
  playStyle: PlayStyle;
};

export type BotProfile = {
  index: number;
  displayName: string;
  region: Region;
  languages: string[];
  timezone: string;
  games: BotGameEntry[];
};

export function botEmail(index: number): string {
  return `bot-${String(index).padStart(4, "0")}@squadup.local`;
}

/** Reproducible synthetic profile for bot #`index`. */
export function makeBotProfile(index: number, seed = 1): BotProfile {
  const rng = mulberry32((seed * 2654435761) ^ (index * 40503));

  const region = pickWeighted(rng, REGION_KEYS, REGION_WEIGHTS);
  const languages = sampleN(rng, LANGUAGES, 1 + Math.floor(rng() * 2));

  const gameCount = 1 + Math.floor(rng() * 2);
  const slugs: string[] = [];
  const catalog = GAME_CATALOG.map((g) => g.slug);
  while (slugs.length < gameCount && slugs.length < catalog.length) {
    const slug = pickWeighted(rng, catalog, GAME_WEIGHTS);
    if (!slugs.includes(slug)) slugs.push(slug);
  }
  const games: BotGameEntry[] = slugs.map((slug) => {
    const game = getGame(slug)!;
    return {
      slug,
      rank: centeredRank(rng, game.ranks),
      roles: sampleN(rng, game.roles, 1 + Math.floor(rng() * Math.min(3, game.roles.length))),
      playStyle: pick(rng, PLAY_STYLE_BAG),
    };
  });

  const handle = `${pick(rng, HANDLE_PARTS)}${pick(rng, HANDLE_PARTS)}`;
  return {
    index,
    displayName: `${handle}${index}`,
    region,
    languages,
    timezone: "UTC",
    games,
  };
}

export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}
