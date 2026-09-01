import type { MatchState } from "./match-lobby";

/** Events pushed on a single match's channel (`mm:match:<id>`). */
export type MatchStreamEvent =
  | {
      kind: "message";
      id: string;
      userId: string;
      name: string;
      body: string;
      createdAt: string;
    }
  | { kind: "ready"; userId: string; ready: boolean }
  | { kind: "state"; state: MatchState };
