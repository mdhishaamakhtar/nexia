import type { ZodiacSign } from "@nexia/shared";

/** Western zodiac for a month (1–12) and day, using the usual cusp dates. */
export function deriveZodiac(month: number, day: number): ZodiacSign | null {
  switch (month) {
    case 1:
      return day >= 20 ? "Aquarius" : "Capricorn";
    case 2:
      return day >= 19 ? "Pisces" : "Aquarius";
    case 3:
      return day >= 21 ? "Aries" : "Pisces";
    case 4:
      return day >= 20 ? "Taurus" : "Aries";
    case 5:
      return day >= 21 ? "Gemini" : "Taurus";
    case 6:
      return day >= 21 ? "Cancer" : "Gemini";
    case 7:
      return day >= 23 ? "Leo" : "Cancer";
    case 8:
      return day >= 23 ? "Virgo" : "Leo";
    case 9:
      return day >= 23 ? "Libra" : "Virgo";
    case 10:
      return day >= 23 ? "Scorpio" : "Libra";
    case 11:
      return day >= 22 ? "Sagittarius" : "Scorpio";
    case 12:
      return day >= 22 ? "Capricorn" : "Sagittarius";
    default:
      return null;
  }
}

/**
 * The sign for a stored `YYYY-MM-DD` birthday, or null without one. Read-time
 * only: the sign is never stored, so it cannot drift from the birthday.
 */
export function zodiacForBirthday(birthday: string | null): ZodiacSign | null {
  if (!birthday) return null;
  const [, month, day] = birthday.split("-").map(Number);
  if (!month || !day) return null;
  return deriveZodiac(month, day);
}
