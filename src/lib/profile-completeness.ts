/**
 * A profile is "complete" — and the player may enter the matchmaking queue —
 * once it has identity (name + region + a language), at least one game with a
 * rank and a role, and at least one availability window.
 */

export type ProfileCompletenessInput = {
  displayName?: string | null;
  region?: string | null;
  languages?: readonly string[] | null;
  games?: readonly { rank?: string | null; roles?: readonly string[] | null }[] | null;
  availability?: readonly unknown[] | null;
};

export function missingProfileRequirements(
  profile: ProfileCompletenessInput | null | undefined,
): string[] {
  if (!profile) return ["a profile"];

  const missing: string[] = [];
  if (!profile.displayName?.trim()) missing.push("a display name");
  if (!profile.region) missing.push("a region");
  if (!profile.languages || profile.languages.length === 0) missing.push("a language");

  const games = profile.games ?? [];
  const hasUsableGame = games.some((g) => !!g.rank && Array.isArray(g.roles) && g.roles.length > 0);
  if (!hasUsableGame) missing.push("a game with a rank and role");

  if (!profile.availability || profile.availability.length === 0) {
    missing.push("an availability window");
  }

  return missing;
}

export function isProfileComplete(profile: ProfileCompletenessInput | null | undefined): boolean {
  return missingProfileRequirements(profile).length === 0;
}
