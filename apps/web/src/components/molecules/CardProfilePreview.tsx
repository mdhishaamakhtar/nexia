import type { ProfileSummary } from "@nexia/shared";
import Link from "next/link";
import { Heart, Tag } from "lucide-react";
import { motion } from "framer-motion";
import Tape from "@/components/atoms/Tape";
import Avatar from "@/features/profiles/components/Avatar";
import ZodiacIcon from "@/features/profiles/components/ZodiacIcon";
import { tapeFor } from "@/features/profiles/identity";
import { enter } from "@/shared/ui/motion";

const MAX_VISIBLE_TAGS = 3;

/**
 * A person's card in the slambook grid. Their tape and avatar tilt are keyed
 * to their id (see identity.ts), so a card looks the same however the grid is
 * filtered — and the sheet it opens is pinned with the same strip.
 */
export default function CardProfilePreview({
  profile,
  index = 0,
}: {
  profile: ProfileSummary;
  index?: number;
}) {
  const tape = tapeFor(profile.id);
  const overflow = profile.tags.length - MAX_VISIBLE_TAGS;

  return (
    // Stagger caps at one viewport's worth so a large slambook isn't slow.
    <motion.li {...enter(Math.min(index, 8) * 0.04, 14)} className="list-none">
      <Link
        href={`/profiles/${profile.id}`}
        className="paper group relative flex h-full flex-col rounded-2xl p-5 transition-[transform,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-line-mid"
      >
        <Tape color={tape.color} width={tape.width} tilt={tape.angle} style={{ top: -5 }} />

        <div className="mb-3.5 flex items-center gap-3">
          <Avatar id={profile.id} name={profile.full_name} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-bold leading-tight text-text-1">
              {profile.full_name}
              {profile.pronouns && (
                <span className="ml-1.5 text-[11px] font-semibold lowercase text-text-3">
                  {profile.pronouns}
                </span>
              )}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="sticker-chip inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold">
                <Heart className="h-2.5 w-2.5" aria-hidden="true" />
                {profile.relationship_type}
              </span>
              {profile.zodiac_sign && (
                <span className="sticker-chip inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold">
                  <ZodiacIcon sign={profile.zodiac_sign} size={10} className="text-blue-ink" />
                  {profile.zodiac_sign}
                </span>
              )}
            </div>
          </div>
        </div>

        {profile.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5">
            {profile.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
              <span
                key={tag}
                className="sticker-tag inline-flex max-w-full items-center gap-1 px-2 py-0.5 text-[11px] font-semibold"
              >
                <Tag className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{tag}</span>
              </span>
            ))}
            {overflow > 0 && (
              <span className="inline-flex items-center px-1 py-0.5 text-[11px] font-semibold text-text-3">
                +{overflow} more
              </span>
            )}
          </div>
        )}
      </Link>
    </motion.li>
  );
}
