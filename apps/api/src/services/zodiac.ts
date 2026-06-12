import type { ZodiacSign } from "@nexia/shared";

export function deriveZodiac(month: number, day: number): ZodiacSign {
  switch (month) {
    case 1: return day >= 20 ? "Aquarius" : "Capricorn";
    case 2: return day >= 19 ? "Pisces" : "Aquarius";
    case 3: return day >= 21 ? "Aries" : "Pisces";
    case 4: return day >= 20 ? "Taurus" : "Aries";
    case 5: return day >= 21 ? "Gemini" : "Taurus";
    case 6: return day >= 21 ? "Cancer" : "Gemini";
    case 7: return day >= 23 ? "Leo" : "Cancer";
    case 8: return day >= 23 ? "Virgo" : "Leo";
    case 9: return day >= 23 ? "Libra" : "Virgo";
    case 10: return day >= 23 ? "Scorpio" : "Libra";
    case 11: return day >= 22 ? "Sagittarius" : "Scorpio";
    case 12: return day >= 22 ? "Capricorn" : "Sagittarius";
    default: return "" as ZodiacSign;
  }
}

export function applyDerivedZodiac(profile: { birthday?: string | null | undefined; zodiac_sign?: string | null | undefined }): void {
  if (!profile.birthday) {
    profile.zodiac_sign = null;
    return;
  }
  const parts = profile.birthday.split("-");
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (isNaN(month) || isNaN(day)) {
    profile.zodiac_sign = null;
    return;
  }
  profile.zodiac_sign = deriveZodiac(month, day);
}
