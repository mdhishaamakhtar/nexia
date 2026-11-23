import type { ProfileSummary } from "@nexia/shared";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Avatar from "@/features/profiles/components/Avatar";
import { identityFor } from "@/features/profiles/identity";
import { enter } from "@/shared/ui/motion";

const MAX_VISIBLE_TAGS = 3;

/**
 * A person's card in the grid: a block of their colour with their shape, who
 * they are to you, and the first few things you've tagged them with. Colour
 * and shape are keyed to their id (see identity.ts), so a card looks the same
 * however the grid is filtered, and matches the page it opens.
 *
 * On a phone the card lies flat, shape beside the name, so a long list stays
 * short; from `sm` up it stands, shape above the name.
 */
export default function CardProfilePreview({
  profile,
  index = 0,
}: {
  profile: ProfileSummary;
  index?: number;
}) {
  const identity = identityFor(profile.id);
  const overflow = profile.tags.length - MAX_VISIBLE_TAGS;
  const chips = [
    ...(profile.zodiac_sign ? [profile.zodiac_sign] : []),
    ...profile.tags.slice(0, MAX_VISIBLE_TAGS),
  ];

  return (
    // Stagger caps at one viewport's worth so a large slambook isn't slow.
    <motion.li {...enter(Math.min(index, 8) * 0.04, 14)} className="list-none">
      <Link
        href={`/profiles/${profile.id}`}
        className={cn(
          identity.className,
          "card-person flex h-full items-center gap-4 rounded-[1.75rem] p-4 transition-transform duration-200 ease-out hover:-translate-y-1 active:scale-[0.985]",
          "sm:min-h-[14.75rem] sm:flex-col sm:items-stretch sm:gap-0 sm:p-[1.375rem]"
        )}
      >
        <Avatar id={profile.id} name={profile.full_name} className="h-14 w-14 sm:h-17 sm:w-17" />

        <div className="min-w-0 flex-1 sm:mt-auto sm:flex-none sm:pt-7">
          <h2 className="break-words text-[1.3125rem] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[1.4375rem]">
            {profile.full_name}
          </h2>
          <p className="mt-1 text-[0.9375rem] font-medium">
            {profile.relationship_type}
            {profile.pronouns && <span> · {profile.pronouns}</span>}
          </p>

          {(chips.length > 0 || overflow > 0) && (
            <ul className="mt-3 flex flex-wrap gap-1.5 sm:mt-3.5">
              {chips.map((chip) => (
                <li
                  key={chip}
                  className="chip chip-on-color h-[1.875rem] max-w-full px-3 text-[0.8125rem]"
                >
                  <span className="truncate">{chip}</span>
                </li>
              ))}
              {overflow > 0 && (
                <li className="chip chip-on-color h-[1.875rem] px-3 text-[0.8125rem]">
                  +{overflow} more
                </li>
              )}
            </ul>
          )}
        </div>
      </Link>
    </motion.li>
  );
}
