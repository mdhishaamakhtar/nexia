import { z } from "zod";

export const RELATIONSHIP_TYPES = [
  "Friend",
  "Family",
  "Colleague",
  "Classmate",
  "Crush",
  "Ex",
  "Mentor",
  "Other",
] as const;

export const ZODIAC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];
export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

export const relationshipTypeSchema = z.enum(RELATIONSHIP_TYPES);
export const zodiacSignSchema = z.enum(ZODIAC_SIGNS);
