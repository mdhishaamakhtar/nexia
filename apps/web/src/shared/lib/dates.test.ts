import { describe, expect, test } from "vitest";
import {
  addDays,
  addMonths,
  ageOn,
  daysInMonth,
  formatDate,
  monthName,
  parseISODate,
  sameDate,
  toISODate,
  todayDate,
  weekdayIndex,
  weekdayNames,
} from "./dates";

describe("parsing", () => {
  test("reads a calendar date and refuses anything that isn't one", () => {
    expect(parseISODate("1996-03-16")).toEqual({ year: 1996, month: 3, day: 16 });
    expect(parseISODate("2023-02-29")).toBeNull();
    expect(parseISODate("1996-3-16")).toBeNull();
    expect(parseISODate("")).toBeNull();
    expect(parseISODate(null)).toBeNull();
    expect(parseISODate(undefined)).toBeNull();
  });

  test("writes one back with padding", () => {
    expect(toISODate({ year: 996, month: 3, day: 6 })).toBe("0996-03-06");
  });
});

describe("formatting", () => {
  test("shows the stored date, never the day before, whatever the time zone", () => {
    // Midnight UTC is still the previous evening in the Americas; formatting
    // in UTC keeps the date that was saved.
    expect(formatDate("1996-03-16", "long", "en-US")).toBe("March 16, 1996");
    expect(formatDate("1996-03-16", "birthday", "en-US")).toBe("March 16");
    expect(formatDate("1996-03-16", "medium", "en-US")).toBe("Mar 16, 1996");
    expect(formatDate("not a date")).toBeNull();
  });

  test("names months and weekdays, Monday first", () => {
    expect(monthName(3, "en-US")).toBe("March");
    expect(monthName(3, "en-US", "short")).toBe("Mar");
    expect(weekdayNames("en-US")).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
  });
});

describe("age", () => {
  const today = new Date(2026, 9, 1); // 1 October 2026, local

  test("counts whole years, turning over on the birthday itself", () => {
    expect(ageOn("1996-03-16", today)).toBe(30);
    expect(ageOn("1996-10-01", today)).toBe(30);
    expect(ageOn("1996-10-02", today)).toBe(29);
    expect(ageOn("1996-11-01", today)).toBe(29);
  });

  test("has nothing to say without a birthday, or before one", () => {
    expect(ageOn(null, today)).toBeNull();
    expect(ageOn("2030-01-01", today)).toBeNull();
  });

  test("defaults to today", () => {
    const { year } = todayDate();
    expect(ageOn(`${year - 10}-01-01`)).toBeGreaterThanOrEqual(9);
  });
});

describe("calendar arithmetic", () => {
  test("knows month lengths, leap years included", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  test("steps days across month and year ends", () => {
    expect(addDays({ year: 2025, month: 12, day: 31 }, 1)).toEqual({
      year: 2026,
      month: 1,
      day: 1,
    });
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({
      year: 2026,
      month: 2,
      day: 28,
    });
  });

  test("steps months and clamps the day to the new month", () => {
    expect(addMonths({ year: 2024, month: 1, day: 31 }, 1)).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
    expect(addMonths({ year: 2026, month: 1, day: 15 }, -1)).toEqual({
      year: 2025,
      month: 12,
      day: 15,
    });
    expect(addMonths({ year: 2026, month: 5, day: 15 }, -12)).toEqual({
      year: 2025,
      month: 5,
      day: 15,
    });
  });

  test("places a day on a Monday-first grid", () => {
    expect(weekdayIndex({ year: 2026, month: 9, day: 28 })).toBe(0); // a Monday
    expect(weekdayIndex({ year: 2026, month: 10, day: 4 })).toBe(6); // a Sunday
  });

  test("compares dates by value", () => {
    const a = { year: 2026, month: 1, day: 1 };
    expect(sameDate(a, { ...a })).toBe(true);
    expect(sameDate(a, { ...a, day: 2 })).toBe(false);
    expect(sameDate(a, null)).toBe(false);
  });
});
