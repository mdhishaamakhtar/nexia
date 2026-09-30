/**
 * Calendar dates arrive as "YYYY-MM-DD" with no time zone. Handing one to
 * `new Date()` makes it midnight UTC, and formatting that in local time moves
 * it a day earlier anywhere west of Greenwich. Everything here formats in UTC,
 * so the date on screen is always the date that was stored.
 */

export interface CalendarDate {
  year: number;
  month: number; // 1–12
  day: number;
}

export function parseISODate(value: string | null | undefined): CalendarDate | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1) return null;
  return { year, month, day };
}

export function toISODate({ year, month, day }: CalendarDate): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toUTC({ year, month, day }: CalendarDate): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

const FORMATS = {
  /** 14 March 1998 (in the reader's locale order) */
  long: { day: "numeric", month: "long", year: "numeric" },
  /** March 14 */
  birthday: { day: "numeric", month: "long" },
  /** Mar 14, 1998 */
  medium: { day: "numeric", month: "short", year: "numeric" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export function formatDate(
  value: string | null | undefined,
  style: keyof typeof FORMATS = "long",
  locale?: string
): string | null {
  const date = parseISODate(value);
  if (!date) return null;
  return toUTC(date).toLocaleDateString(locale, { ...FORMATS[style], timeZone: "UTC" });
}

/** Whole years between `birthday` and `today`, or null without a birthday. */
export function ageOn(birthday: string | null | undefined, today = new Date()): number | null {
  const date = parseISODate(birthday);
  if (!date) return null;
  const now = { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
  const hadBirthday = now.month > date.month || (now.month === date.month && now.day >= date.day);
  const age = now.year - date.year - (hadBirthday ? 0 : 1);
  return age >= 0 ? age : null;
}

export function todayDate(): CalendarDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Monday … 6 = Sunday, for a Monday-first grid. */
export function weekdayIndex(date: CalendarDate): number {
  return (toUTC(date).getUTCDay() + 6) % 7;
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Moves by whole months, clamping the day (31 Jan + 1 month → 28/29 Feb). */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const index = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}

export function sameDate(a: CalendarDate | null, b: CalendarDate | null): boolean {
  return !!a && !!b && a.year === b.year && a.month === b.month && a.day === b.day;
}

export function monthName(
  month: number,
  locale?: string,
  style: "long" | "short" = "long"
): string {
  return new Date(Date.UTC(2000, month - 1, 1)).toLocaleDateString(locale, {
    month: style,
    timeZone: "UTC",
  });
}

/** Narrow weekday names, Monday first. */
export function weekdayNames(locale?: string): string[] {
  // 3 Jan 2000 was a Monday.
  return Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2000, 0, 3 + i)).toLocaleDateString(locale, {
      weekday: "narrow",
      timeZone: "UTC",
    })
  );
}
