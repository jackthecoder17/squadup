"use client";

import { inputClass } from "@/components/field";
import {
  DAYS,
  formatWindow,
  mergeWindows,
  parseHHMM,
  type NormalizedWindow,
} from "@/lib/availability";

import type { WindowDraft, WizardData } from "./types";

type Props = {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
};

function newWindow(): WindowDraft {
  return { id: crypto.randomUUID(), dayOfWeek: 1, start: "19:00", end: "22:00" };
}

function toNormalized(windows: WindowDraft[]): NormalizedWindow[] {
  const out: NormalizedWindow[] = [];
  for (const w of windows) {
    const startMinute = parseHHMM(w.start);
    const endMinute = parseHHMM(w.end);
    if (startMinute === null || endMinute === null || endMinute <= startMinute) continue;
    out.push({ dayOfWeek: w.dayOfWeek, startMinute, endMinute });
  }
  return out;
}

export function StepAvailability({ data, update }: Props) {
  const merged = mergeWindows(toNormalized(data.windows));

  function patchWindow(id: string, patch: Partial<WindowDraft>) {
    update({
      windows: data.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        When are you usually online to play? Add at least one window. Times are in your timezone (
        {data.timezone || "unknown"}).
      </p>

      <div className="space-y-2">
        {data.windows.map((window) => {
          const start = parseHHMM(window.start);
          const end = parseHHMM(window.end);
          const invalid = start === null || end === null || end <= start;
          return (
            <div key={window.id} className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Day of week"
                className={`${inputClass} w-36`}
                value={window.dayOfWeek}
                onChange={(e) => patchWindow(window.id, { dayOfWeek: Number(e.target.value) })}
              >
                {DAYS.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
              <input
                aria-label="Start time"
                type="time"
                className={`${inputClass} w-32`}
                value={window.start}
                onChange={(e) => patchWindow(window.id, { start: e.target.value })}
              />
              <span className="text-sm text-zinc-500">to</span>
              <input
                aria-label="End time"
                type="time"
                className={`${inputClass} w-32`}
                value={window.end}
                onChange={(e) => patchWindow(window.id, { end: e.target.value })}
              />
              {invalid ? (
                <span className="text-xs text-red-600 dark:text-red-400">
                  End must be after start
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => update({ windows: data.windows.filter((w) => w.id !== window.id) })}
                className="ml-auto text-sm text-zinc-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => update({ windows: [...data.windows, newWindow()] })}
        className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
      >
        + Add window
      </button>

      {merged.length > 0 ? (
        <div className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
          <p className="mb-1 text-xs font-medium text-zinc-500">Weekly schedule</p>
          <ul className="space-y-0.5">
            {merged.map((w) => (
              <li key={`${w.dayOfWeek}-${w.startMinute}`}>{formatWindow(w)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
