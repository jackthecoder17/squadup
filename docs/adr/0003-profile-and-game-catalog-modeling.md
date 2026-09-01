# 0003. Profile and game-catalog modeling

- **Status:** accepted
- **Date:** 2026-09-01

## Context

Player profiles need per-game detail (roles, rank, intent) and a recurring weekly
availability schedule. Games differ in their role sets and rank ladders, and matchmaking
later needs to compare ranks within a game and line up availability across timezones.

## Decision

- **The game catalog lives in code** (`src/lib/games.ts`) as the source of truth and is
  **mirrored into a `Game` table** by an idempotent seed. The UI imports the typed
  catalog directly for role/rank options; `GameProfile` rows carry a real FK to `Game`
  so the relational graph stays sound. Catalog/DB drift throws loudly in the service.
- **Availability windows never cross midnight.** A late-night slot is two windows. This
  keeps overlap detection and "who's online at time T" a plain interval test, with no
  wraparound special-casing. Windows are stored as `(dayOfWeek, startMinute, endMinute)`
  in the profile's IANA timezone.
- **Domain logic is framework-free and unit-tested** in `src/lib/` — `availability.ts`
  (parse, merge, format), `profile-schema.ts` (zod, incl. cross-field checks like
  "rank belongs to this game"), `profile-completeness.ts` (queue-eligibility gate).
- **Writes are validated twice**: the client wizard re-runs the same zod schemas to gate
  each step, and the Server Actions re-parse authoritatively before touching the DB.
- **Bulk replace over granular diffing** for games and availability on the edit screen:
  the editor sends the whole set and the service does delete-all + `createMany` in a
  transaction. Simpler and race-free; these sets are tiny.
- **E2E tests authenticate by minting a session JWT** with `AUTH_SECRET`
  (`e2e/support/auth.ts`) rather than driving the Discord OAuth flow, so the full
  onboarding journey is covered in CI.

## Consequences

- Adding or retuning a game is a code change plus `pnpm db:seed`; no admin UI.
- The midnight rule is a small UX cost (two rows for one late session) for a large
  simplification everywhere downstream.
- Bulk replace churns `GameProfile`/`AvailabilityWindow` ids on every save; nothing
  references those ids yet, and matchmaking will key off `profileId` + `gameId`.
- The e2e JWT helper hard-codes the `authjs.session-token` cookie name and salt; if the
  session strategy or cookie naming changes, that helper changes with it.
