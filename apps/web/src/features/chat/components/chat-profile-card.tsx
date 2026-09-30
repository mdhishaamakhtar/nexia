import type { ProfileSummary } from "@nexia/shared";
import Link from "next/link";
import { Heart } from "lucide-react";
import Avatar from "@/features/profiles/components/Avatar";
import ZodiacIcon from "@/features/profiles/components/ZodiacIcon";

/**
 * A person found by the agent, drawn as a smaller cousin of their card in the
 * grid: the same lavender avatar and tilt, the same sticker chips.
 */
export function ChatProfileCard({ profile }: { profile: ProfileSummary }) {
  return (
    <Link
      href={`/profiles/${profile.id}`}
      className="paper flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-line-mid"
    >
      <Avatar id={profile.id} name={profile.full_name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-text-1">{profile.full_name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
          {profile.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="sticker-tag hidden px-2 py-0.5 text-[11px] font-semibold sm:inline-flex"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export function ChatProfileList({
  profiles,
  max = 3,
}: {
  profiles: ProfileSummary[];
  max?: number;
}) {
  const visible = profiles.slice(0, max);
  const remaining = profiles.length - visible.length;
  return (
    <div className="flex flex-col gap-2">
      {visible.map((profile) => (
        <ChatProfileCard key={profile.id} profile={profile} />
      ))}
      {remaining > 0 && (
        <p className="pl-1 text-xs font-semibold text-text-3">and {remaining} more</p>
      )}
    </div>
  );
}
