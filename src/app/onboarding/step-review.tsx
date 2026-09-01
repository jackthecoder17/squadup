"use client";

import { formatWindow, mergeWindows, parseHHMM, type NormalizedWindow } from "@/lib/availability";
import { getGame } from "@/lib/games";
import { regionLabel, type Region } from "@/lib/regions";

import type { WizardData } from "./types";

function normalized(data: WizardData): NormalizedWindow[] {
  const out: NormalizedWindow[] = [];
  for (const w of data.windows) {
    const startMinute = parseHHMM(w.start);
    const endMinute = parseHHMM(w.end);
    if (startMinute === null || endMinute === null || endMinute <= startMinute) continue;
    out.push({ dayOfWeek: w.dayOfWeek, startMinute, endMinute });
  }
  return mergeWindows(out);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-28 shrink-0 text-zinc-500">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function StepReview({ data }: { data: WizardData }) {
  const schedule = normalized(data);

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        Looks right? You can change any of this later from your profile.
      </p>

      <section>
        <h3 className="mb-1 text-sm font-semibold">Identity</h3>
        <Row label="Name">{data.displayName}</Row>
        <Row label="Region">{data.region ? regionLabel(data.region as Region) : "—"}</Row>
        <Row label="Languages">{data.languages.join(", ") || "—"}</Row>
        <Row label="Timezone">{data.timezone || "—"}</Row>
        {data.bio.trim() ? <Row label="Bio">{data.bio.trim()}</Row> : null}
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold">Games</h3>
        {data.games.map((g) => {
          const game = getGame(g.slug);
          return (
            <Row key={g.slug} label={game?.name ?? g.slug}>
              {g.rank || "unranked"} · {g.roles.join(", ") || "no roles"} ·{" "}
              {g.playStyle.toLowerCase()}
            </Row>
          );
        })}
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold">Availability</h3>
        {schedule.length > 0 ? (
          <ul className="space-y-0.5 text-sm">
            {schedule.map((w) => (
              <li key={`${w.dayOfWeek}-${w.startMinute}`}>{formatWindow(w)}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">—</p>
        )}
      </section>
    </div>
  );
}
