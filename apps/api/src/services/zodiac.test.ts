import { describe, test, expect } from "bun:test";
import { deriveZodiac, applyDerivedZodiac } from "../services/zodiac";

describe("deriveZodiac", () => {
  const cases = [
    ["January early (Capricorn)", 1, 1, "Capricorn"],
    ["January late (Aquarius)", 1, 20, "Aquarius"],
    ["February early (Aquarius)", 2, 18, "Aquarius"],
    ["February late (Pisces)", 2, 20, "Pisces"],
    ["March early (Pisces)", 3, 20, "Pisces"],
    ["March late (Aries)", 3, 21, "Aries"],
    ["April early (Aries)", 4, 19, "Aries"],
    ["April late (Taurus)", 4, 21, "Taurus"],
    ["May early (Taurus)", 5, 20, "Taurus"],
    ["May late (Gemini)", 5, 22, "Gemini"],
    ["June early (Gemini)", 6, 20, "Gemini"],
    ["June late (Cancer)", 6, 22, "Cancer"],
    ["July early (Cancer)", 7, 22, "Cancer"],
    ["July late (Leo)", 7, 24, "Leo"],
    ["August early (Leo)", 8, 22, "Leo"],
    ["August late (Virgo)", 8, 24, "Virgo"],
    ["September early (Virgo)", 9, 22, "Virgo"],
    ["September late (Libra)", 9, 24, "Libra"],
    ["October early (Libra)", 10, 22, "Libra"],
    ["October late (Scorpio)", 10, 24, "Scorpio"],
    ["November early (Scorpio)", 11, 21, "Scorpio"],
    ["November late (Sagittarius)", 11, 23, "Sagittarius"],
    ["December early (Sagittarius)", 12, 21, "Sagittarius"],
    ["December late (Capricorn)", 12, 22, "Capricorn"],
  ] as const;

  for (const [name, month, day, expected] of cases) {
    test(name, () => {
      expect(deriveZodiac(month, day)).toBe(expected);
    });
  }
});

describe("applyDerivedZodiac", () => {
  test("sets zodiac from birthday", () => {
    const profile: {
      birthday?: string | null | undefined;
      zodiac_sign?: string | null | undefined;
    } = { birthday: "2001-03-22" };
    applyDerivedZodiac(profile);
    expect(profile.zodiac_sign).toBe("Aries");
  });

  test("null birthday → null zodiac", () => {
    const profile: {
      birthday?: string | null | undefined;
      zodiac_sign?: string | null | undefined;
    } = { birthday: null };
    applyDerivedZodiac(profile);
    expect(profile.zodiac_sign).toBeNull();
  });

  test("undefined birthday → null zodiac", () => {
    const profile: {
      birthday?: string | null | undefined;
      zodiac_sign?: string | null | undefined;
    } = {};
    applyDerivedZodiac(profile);
    expect(profile.zodiac_sign).toBeNull();
  });

  test("sets null zodiac for empty birthday", () => {
    const profile: {
      birthday?: string | null | undefined;
      zodiac_sign?: string | null | undefined;
    } = { birthday: "" };
    applyDerivedZodiac(profile);
    expect(profile.zodiac_sign).toBeNull();
  });
});
