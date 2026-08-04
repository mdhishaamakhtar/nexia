import Link from "next/link";
import { Heart, Tag } from "lucide-react";
import { motion } from "framer-motion";
import ZodiacIcon from "@/features/profiles/components/ZodiacIcon";
import type { ProfileSummary } from "@/shared/types/profile";

interface CardProfilePreviewProps {
  profile: ProfileSummary;
  href: string;
  index?: number;
}

// Avatar tints rotate so a grid reads as a scrapbook rather than a table.
// Each pairs with an ink that clears AA on that tint.
const AVATAR_TINTS = [
  { bg: "var(--lavender)", ink: "var(--lavender-ink)" },
  { bg: "var(--blue)", ink: "var(--blue-ink)" },
  { bg: "var(--peach)", ink: "var(--peach-ink)" },
] as const;

// Tape is keyed off the profile id, not the grid index, so a person keeps the
// same colour and angle no matter how the list is filtered or sorted — the
// scrapbook stays recognisable instead of reshuffling under you.
const TAPES = [
  { color: "var(--peach)", angle: -2.5, width: 42 },
  { color: "var(--lavender)", angle: 1.8, width: 38 },
  { color: "var(--blue)", angle: -1.2, width: 46 },
  { color: "var(--lavender)", angle: 3, width: 34 },
  { color: "var(--peach)", angle: -3.4, width: 36 },
] as const;

const MAX_VISIBLE_TAGS = 3;

export default function CardProfilePreview({ profile, href, index = 0 }: CardProfilePreviewProps) {
  const tint = AVATAR_TINTS[index % AVATAR_TINTS.length]!;
  const tape = TAPES[Number(profile.id) % TAPES.length] ?? TAPES[0];
  const tags = profile.tags ?? [];
  const overflow = tags.length - MAX_VISIBLE_TAGS;

  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
        // Stagger caps at one viewport's worth so a large slambook isn't slow.
        delay: Math.min(index, 8) * 0.05,
      }}
      className="list-none"
    >
      <Link href={href} prefetch className="block h-full">
        {/* Hover runs on springs, not a CSS transition — the lift needs the
            overshoot to feel like picking a page up. Entrance stays on the
            outer li so the two never fight over transform. */}
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ y: -2, scale: 1.005 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="paper group relative flex h-full flex-col rounded-2xl p-5 transition-colors duration-200 hover:border-(--border-mid)"
        >
          <span
            className="washi-tape opacity-0 transition-opacity duration-200 group-hover:opacity-70"
            style={{
              width: tape.width,
              top: -5,
              background: tape.color,
              transform: `translateX(-50%) rotate(${tape.angle}deg)`,
            }}
            aria-hidden="true"
          />

          <div className="mb-3.5 flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold"
              style={{
                background: tint.bg,
                color: tint.ink,
                transform: `rotate(${[-3, 3, -2][index % 3]}deg)`,
              }}
              aria-hidden="true"
            >
              {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
            </span>

            <div className="min-w-0 flex-1">
              <h3
                className="truncate text-[15px] font-bold leading-tight"
                style={{ color: "var(--text-1)" }}
              >
                {profile.full_name}
                {profile.pronouns && (
                  <span
                    className="ml-1.5 text-[11px] font-semibold lowercase"
                    style={{ color: "var(--text-3)" }}
                  >
                    {profile.pronouns}
                  </span>
                )}
              </h3>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="sticker-chip inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold">
                  <Heart className="h-2.5 w-2.5" aria-hidden="true" />
                  {profile.relationship_type}
                </span>
                {profile.zodiac_sign && (
                  <span className="sticker-chip inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold">
                    <ZodiacIcon
                      sign={profile.zodiac_sign}
                      size={10}
                      className="text-(--blue-ink)"
                    />
                    {profile.zodiac_sign}
                  </span>
                )}
              </div>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1.5">
              {tags.slice(0, MAX_VISIBLE_TAGS).map((tag, i) => (
                <span
                  key={i}
                  className="sticker-tag inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold"
                >
                  <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                  {tag.tag}
                </span>
              ))}
              {overflow > 0 && (
                <span
                  className="inline-flex items-center px-1 py-0.5 text-[11px] font-semibold"
                  style={{ color: "var(--text-3)" }}
                >
                  +{overflow}
                </span>
              )}
            </div>
          )}
        </motion.div>
      </Link>
    </motion.li>
  );
}
