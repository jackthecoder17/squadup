"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { cn } from "@/lib/cn";
import { availabilitySchema, basicsSchema, gameEntrySchema } from "@/lib/profile-schema";
import { guessTimeZone } from "@/lib/time-zone";
import { completeOnboardingAction } from "@/server/profile/actions";

import { StepAvailability } from "./step-availability";
import { StepBasics } from "./step-basics";
import { StepGames } from "./step-games";
import { StepReview } from "./step-review";
import { EMPTY_WIZARD, toPayload, type WizardData } from "./types";

const STEPS = ["Basics", "Games", "Availability", "Review"] as const;

function basicsValid(data: WizardData): boolean {
  return basicsSchema.safeParse({
    displayName: data.displayName,
    region: data.region,
    languages: data.languages,
    bio: data.bio.trim() || undefined,
    timezone: data.timezone,
  }).success;
}

function gamesValid(data: WizardData): boolean {
  return (
    data.games.length > 0 &&
    data.games.every(
      (g) =>
        gameEntrySchema.safeParse({
          gameSlug: g.slug,
          roles: g.roles,
          rank: g.rank,
          playStyle: g.playStyle,
        }).success,
    )
  );
}

function availabilityValid(data: WizardData): boolean {
  return availabilitySchema.safeParse(
    data.windows.map((w) => ({ dayOfWeek: w.dayOfWeek, start: w.start, end: w.end })),
  ).success;
}

export function OnboardingWizard() {
  const [data, setData] = useState<WizardData>(EMPTY_WIZARD);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // One-time: seed the timezone from the browser after mount. A lazy
    // initializer would also run on the server and cause a hydration mismatch,
    // since the server's timezone isn't the user's.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData((prev) => (prev.timezone ? prev : { ...prev, timezone: guessTimeZone() }));
  }, []);

  const update = (patch: Partial<WizardData>) => setData((prev) => ({ ...prev, ...patch }));

  const stepValid = useMemo(() => {
    if (step === 0) return basicsValid(data);
    if (step === 1) return gamesValid(data);
    if (step === 2) return availabilityValid(data);
    return true;
  }, [step, data]);

  const canSubmit = basicsValid(data) && gamesValid(data) && availabilityValid(data);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboardingAction(toPayload(data));
      // A successful action redirects; we only get here on failure.
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <p className="font-mono text-sm text-zinc-500">squadup</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Set up your profile</h1>

      <ol className="mt-6 flex gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={cn(
              "flex-1 border-t-2 pt-2 text-xs font-medium",
              index <= step
                ? "border-foreground text-foreground"
                : "border-zinc-200 text-zinc-400 dark:border-zinc-800",
            )}
          >
            {label}
          </li>
        ))}
      </ol>

      <div className="mt-8">
        {step === 0 && <StepBasics data={data} update={update} />}
        {step === 1 && <StepGames data={data} update={update} />}
        {step === 2 && <StepAvailability data={data} update={update} />}
        {step === 3 && <StepReview data={data} />}
      </div>

      {error ? (
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || isPending}
          className="hover:text-foreground rounded-full px-4 py-2 text-sm font-medium text-zinc-600 disabled:opacity-40 dark:text-zinc-400"
        >
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!stepValid}
            className="bg-foreground text-background rounded-full px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || isPending}
            className="bg-foreground text-background rounded-full px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Finish setup"}
          </button>
        )}
      </div>
    </div>
  );
}
