"use client";

import { ChipGroup } from "@/components/chip-group";
import { inputClass } from "@/components/field";
import { cn } from "@/lib/cn";
import { GAME_CATALOG } from "@/lib/games";
import { PLAY_STYLES, type PlayStyle } from "@/lib/profile-schema";

import type { GameDraft, WizardData } from "./types";

const PLAY_STYLE_LABEL: Record<PlayStyle, string> = {
  CASUAL: "Casual",
  COMPETITIVE: "Competitive",
  BOTH: "Both",
};

type Props = {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
};

export function StepGames({ data, update }: Props) {
  const selectedSlugs = new Set(data.games.map((g) => g.slug));

  function toggleGame(slug: string) {
    update({
      games: selectedSlugs.has(slug)
        ? data.games.filter((g) => g.slug !== slug)
        : [...data.games, { slug, roles: [], rank: "", playStyle: "BOTH" }],
    });
  }

  function patchGame(slug: string, patch: Partial<GameDraft>) {
    update({
      games: data.games.map((g) => (g.slug === slug ? { ...g, ...patch } : g)),
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-muted text-sm">
        Pick the games you want to be matched in. Add at least one.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GAME_CATALOG.map((game) => {
          const active = selectedSlugs.has(game.slug);
          return (
            <button
              key={game.slug}
              type="button"
              aria-pressed={active}
              onClick={() => toggleGame(game.slug)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "border-border hover:border-subtle",
              )}
            >
              {game.name}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {data.games.map((draft) => {
          const game = GAME_CATALOG.find((g) => g.slug === draft.slug);
          if (!game) return null;
          return (
            <div key={draft.slug} className="border-border rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">{game.name}</h3>

              <div className="space-y-3">
                <div>
                  <p className="text-muted mb-1.5 text-xs font-medium">Roles (up to 5)</p>
                  <ChipGroup
                    aria-label={`${game.name} roles`}
                    options={game.roles}
                    selected={draft.roles}
                    max={5}
                    onToggle={(role) =>
                      patchGame(draft.slug, {
                        roles: draft.roles.includes(role)
                          ? draft.roles.filter((r) => r !== role)
                          : [...draft.roles, role],
                      })
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <label className="flex-1 space-y-1">
                    <span className="text-muted text-xs font-medium">Current rank</span>
                    <select
                      className={inputClass}
                      value={draft.rank}
                      onChange={(e) => patchGame(draft.slug, { rank: e.target.value })}
                    >
                      <option value="" disabled>
                        Select rank
                      </option>
                      {game.ranks.map((rank) => (
                        <option key={rank} value={rank}>
                          {rank}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex-1 space-y-1">
                    <span className="text-muted text-xs font-medium">Intent</span>
                    <select
                      className={inputClass}
                      value={draft.playStyle}
                      onChange={(e) =>
                        patchGame(draft.slug, { playStyle: e.target.value as PlayStyle })
                      }
                    >
                      {PLAY_STYLES.map((style) => (
                        <option key={style} value={style}>
                          {PLAY_STYLE_LABEL[style]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
