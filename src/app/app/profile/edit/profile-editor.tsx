"use client";

import { useState, useTransition, type ReactNode } from "react";

import { StepAvailability } from "@/app/onboarding/step-availability";
import { StepBasics } from "@/app/onboarding/step-basics";
import { StepGames } from "@/app/onboarding/step-games";
import type { WizardData } from "@/app/onboarding/types";
import {
  replaceAvailabilityAction,
  replaceGamesAction,
  updateBasicsAction,
  type ActionResult,
} from "@/server/profile/actions";

type SectionProps = {
  title: string;
  onSave: () => Promise<ActionResult>;
  children: ReactNode;
};

function SaveSection({ title, onSave, children }: SectionProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <section className="space-y-4 border-b border-zinc-200 pb-10 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setStatus(null);
            startTransition(async () => {
              const result = await onSave();
              setStatus(
                result.ok ? { ok: true, message: "Saved" } : { ok: false, message: result.error },
              );
            });
          }}
          className="bg-foreground text-background rounded-full px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isPending ? "Saving…" : `Save ${title.toLowerCase()}`}
        </button>
        {status ? (
          <span
            className={
              status.ok
                ? "text-sm text-green-600 dark:text-green-400"
                : "text-sm text-red-600 dark:text-red-400"
            }
          >
            {status.message}
          </span>
        ) : null}
      </div>
    </section>
  );
}

export function ProfileEditor({ initial }: { initial: WizardData }) {
  const [data, setData] = useState<WizardData>(initial);
  const update = (patch: Partial<WizardData>) => setData((prev) => ({ ...prev, ...patch }));

  return (
    <div className="space-y-10">
      <SaveSection
        title="Basics"
        onSave={() =>
          updateBasicsAction({
            displayName: data.displayName.trim(),
            region: data.region,
            languages: data.languages,
            bio: data.bio.trim() || undefined,
            timezone: data.timezone,
          })
        }
      >
        <StepBasics data={data} update={update} />
      </SaveSection>

      <SaveSection
        title="Games"
        onSave={() =>
          replaceGamesAction(
            data.games.map((g) => ({
              gameSlug: g.slug,
              roles: g.roles,
              rank: g.rank,
              playStyle: g.playStyle,
            })),
          )
        }
      >
        <StepGames data={data} update={update} />
      </SaveSection>

      <SaveSection
        title="Availability"
        onSave={() =>
          replaceAvailabilityAction(
            data.windows.map((w) => ({
              dayOfWeek: w.dayOfWeek,
              start: w.start,
              end: w.end,
            })),
          )
        }
      >
        <StepAvailability data={data} update={update} />
      </SaveSection>
    </div>
  );
}
