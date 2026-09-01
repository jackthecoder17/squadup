export const MAX_MESSAGE_LENGTH = 500;

export type MatchState = "FORMED" | "READY" | "LIVE" | "COMPLETED" | "CANCELLED";

export function allReady(players: readonly { ready: boolean }[]): boolean {
  return players.length > 0 && players.every((p) => p.ready);
}

/**
 * The match state after a ready toggle: FORMED locks to READY once everyone is
 * ready, and READY falls back to FORMED if someone un-readies. Any other state
 * is left alone.
 */
export function stateAfterReadyChange(current: MatchState, everyoneReady: boolean): MatchState {
  if (current === "FORMED" && everyoneReady) return "READY";
  if (current === "READY" && !everyoneReady) return "FORMED";
  return current;
}

export function canChat(state: MatchState): boolean {
  return state !== "CANCELLED";
}

export function canLeave(state: MatchState): boolean {
  return state === "FORMED" || state === "READY";
}

export function canLaunch(state: MatchState): boolean {
  return state === "READY";
}

export function isRateable(state: MatchState): boolean {
  return state === "LIVE" || state === "COMPLETED";
}

export class LobbyError extends Error {}

export function validateMessage(raw: string): string {
  const body = raw.trim();
  if (body.length === 0) throw new LobbyError("Message can't be empty.");
  if (body.length > MAX_MESSAGE_LENGTH) {
    throw new LobbyError(`Keep it under ${MAX_MESSAGE_LENGTH} characters.`);
  }
  return body;
}
