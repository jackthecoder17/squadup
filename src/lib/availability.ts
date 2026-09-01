/**
 * Availability windows are stored as (dayOfWeek, startMinute, endMinute) in the
 * player's local timezone. A window never crosses midnight — a late-night slot
 * that spans two calendar days is entered as two windows. This keeps overlap
 * math and matchmaking-time comparisons trivial.
 */

export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const MINUTES_IN_DAY = 24 * 60;

export type TimeWindowInput = {
  dayOfWeek: number;
  start: string; // "HH:MM", 24h
  end: string; // "HH:MM", 24h
};

export type NormalizedWindow = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

/** Parse "HH:MM" (24h) into minutes from midnight. Returns null if malformed. */
export function parseHHMM(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minutesToHHMM(total: number): string {
  const clamped = ((total % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Human label, e.g. 570 -> "9:30 AM". */
export function minutesToLabel(total: number): string {
  const clamped = ((total % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours24 = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export class AvailabilityError extends Error {}

/**
 * Validate and convert raw form input into normalized windows. Throws
 * `AvailabilityError` with a user-facing message on the first problem.
 */
export function toNormalizedWindow(input: TimeWindowInput): NormalizedWindow {
  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    throw new AvailabilityError("Pick a day of the week.");
  }
  const startMinute = parseHHMM(input.start);
  const endMinute = parseHHMM(input.end);
  if (startMinute === null || endMinute === null) {
    throw new AvailabilityError("Enter times as HH:MM.");
  }
  if (endMinute <= startMinute) {
    throw new AvailabilityError("End time must be after start time.");
  }
  return { dayOfWeek: input.dayOfWeek, startMinute, endMinute };
}

/** True when two windows fall on the same day and their intervals intersect. */
export function windowsOverlap(a: NormalizedWindow, b: NormalizedWindow): boolean {
  return a.dayOfWeek === b.dayOfWeek && a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

/**
 * Sort by (day, start) and merge windows that overlap or touch, so storage and
 * display never show "9–11" next to "10–12" for the same day.
 */
export function mergeWindows(windows: NormalizedWindow[]): NormalizedWindow[] {
  const sorted = [...windows].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute,
  );

  const merged: NormalizedWindow[] = [];
  for (const window of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.dayOfWeek === window.dayOfWeek && window.startMinute <= last.endMinute) {
      last.endMinute = Math.max(last.endMinute, window.endMinute);
    } else {
      merged.push({ ...window });
    }
  }
  return merged;
}

export function totalWeeklyMinutes(windows: NormalizedWindow[]): number {
  return windows.reduce((sum, w) => sum + (w.endMinute - w.startMinute), 0);
}

export function formatWindow(window: NormalizedWindow): string {
  return `${DAY_ABBR[window.dayOfWeek]} ${minutesToLabel(window.startMinute)} – ${minutesToLabel(
    window.endMinute,
  )}`;
}
