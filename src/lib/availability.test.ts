import { describe, expect, it } from "vitest";

import {
  AvailabilityError,
  formatWindow,
  mergeWindows,
  minutesToHHMM,
  minutesToLabel,
  parseHHMM,
  toNormalizedWindow,
  totalWeeklyMinutes,
  windowsOverlap,
  type NormalizedWindow,
} from "./availability";

describe("parseHHMM", () => {
  it("parses valid times", () => {
    expect(parseHHMM("00:00")).toBe(0);
    expect(parseHHMM("09:30")).toBe(570);
    expect(parseHHMM("23:59")).toBe(1439);
    expect(parseHHMM("9:05")).toBe(545);
  });

  it("rejects malformed or out-of-range input", () => {
    expect(parseHHMM("24:00")).toBeNull();
    expect(parseHHMM("12:60")).toBeNull();
    expect(parseHHMM("noon")).toBeNull();
    expect(parseHHMM("12")).toBeNull();
    expect(parseHHMM("")).toBeNull();
  });
});

describe("minutes formatting", () => {
  it("round-trips through HH:MM", () => {
    expect(minutesToHHMM(570)).toBe("09:30");
    expect(minutesToHHMM(0)).toBe("00:00");
    expect(minutesToHHMM(1439)).toBe("23:59");
  });

  it("renders 12-hour labels", () => {
    expect(minutesToLabel(0)).toBe("12:00 AM");
    expect(minutesToLabel(570)).toBe("9:30 AM");
    expect(minutesToLabel(720)).toBe("12:00 PM");
    expect(minutesToLabel(1290)).toBe("9:30 PM");
  });
});

describe("toNormalizedWindow", () => {
  it("converts valid input", () => {
    expect(toNormalizedWindow({ dayOfWeek: 3, start: "18:00", end: "22:30" })).toEqual({
      dayOfWeek: 3,
      startMinute: 1080,
      endMinute: 1350,
    });
  });

  it("rejects a bad day", () => {
    expect(() => toNormalizedWindow({ dayOfWeek: 7, start: "18:00", end: "22:00" })).toThrow(
      AvailabilityError,
    );
  });

  it("rejects end <= start", () => {
    expect(() => toNormalizedWindow({ dayOfWeek: 1, start: "20:00", end: "20:00" })).toThrow(
      /after start/i,
    );
    expect(() => toNormalizedWindow({ dayOfWeek: 1, start: "20:00", end: "19:00" })).toThrow(
      AvailabilityError,
    );
  });

  it("rejects unparseable times", () => {
    expect(() => toNormalizedWindow({ dayOfWeek: 1, start: "8pm", end: "10pm" })).toThrow(/HH:MM/);
  });
});

describe("windowsOverlap", () => {
  const base: NormalizedWindow = { dayOfWeek: 2, startMinute: 600, endMinute: 720 };

  it("detects intersection on the same day", () => {
    expect(windowsOverlap(base, { dayOfWeek: 2, startMinute: 700, endMinute: 800 })).toBe(true);
  });

  it("treats touching endpoints as non-overlapping", () => {
    expect(windowsOverlap(base, { dayOfWeek: 2, startMinute: 720, endMinute: 800 })).toBe(false);
  });

  it("is false across different days", () => {
    expect(windowsOverlap(base, { dayOfWeek: 3, startMinute: 600, endMinute: 720 })).toBe(false);
  });
});

describe("mergeWindows", () => {
  it("merges overlapping and adjacent windows on the same day", () => {
    const merged = mergeWindows([
      { dayOfWeek: 1, startMinute: 600, endMinute: 720 },
      { dayOfWeek: 1, startMinute: 700, endMinute: 800 },
      { dayOfWeek: 1, startMinute: 800, endMinute: 900 },
    ]);
    expect(merged).toEqual([{ dayOfWeek: 1, startMinute: 600, endMinute: 900 }]);
  });

  it("keeps separate windows apart and orders by day then start", () => {
    const merged = mergeWindows([
      { dayOfWeek: 5, startMinute: 1200, endMinute: 1300 },
      { dayOfWeek: 1, startMinute: 900, endMinute: 1000 },
      { dayOfWeek: 1, startMinute: 600, endMinute: 700 },
    ]);
    expect(merged).toEqual([
      { dayOfWeek: 1, startMinute: 600, endMinute: 700 },
      { dayOfWeek: 1, startMinute: 900, endMinute: 1000 },
      { dayOfWeek: 5, startMinute: 1200, endMinute: 1300 },
    ]);
  });

  it("does not mutate its input", () => {
    const input = [{ dayOfWeek: 1, startMinute: 600, endMinute: 720 }];
    mergeWindows(input);
    expect(input[0].endMinute).toBe(720);
  });
});

describe("totalWeeklyMinutes", () => {
  it("sums window durations", () => {
    expect(
      totalWeeklyMinutes([
        { dayOfWeek: 1, startMinute: 600, endMinute: 720 },
        { dayOfWeek: 2, startMinute: 0, endMinute: 60 },
      ]),
    ).toBe(180);
  });
});

describe("formatWindow", () => {
  it("renders a readable label", () => {
    expect(formatWindow({ dayOfWeek: 3, startMinute: 1080, endMinute: 1350 })).toBe(
      "Wed 6:00 PM – 10:30 PM",
    );
  });
});
