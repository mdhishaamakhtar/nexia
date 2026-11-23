import type { ProfileSummary } from "@nexia/shared";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Avatar from "@/features/profiles/components/Avatar";
import { identityFor } from "@/features/profiles/identity";

/**
 * A person found by the agent, drawn as a smaller cousin of their card in the
 * grid: the same colour, the same shape, lying flat.
 */
export function ChatProfileCard({ profile }: { profile: ProfileSummary }) {
  const chips = [
    ...(profile.zodiac_sign ? [profile.zodiac_sign] : []),
    ...profile.tags.slice(0, 2),
  ];
  return (
    <Link
      href={`/profiles/${profile.id}`}
      className={cn(
        identityFor(profile.id).className,
        "card-person flex items-center gap-3.5 rounded-[1.375rem] p-3.5 transition-transform duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.985]"
      )}
    >
      <Avatar id={profile.id} name={profile.full_name} size="sm" className="h-12 w-12" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[1.0625rem] font-bold leading-tight tracking-[-0.015em]">
          {profile.full_name}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium">
          {profile.relationship_type}
          {profile.pronouns && <span> · {profile.pronouns}</span>}
        </p>
        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip}
                className="chip chip-on-color h-7 max-w-full px-2.5 text-[0.8125rem]"
              >
                <span className="truncate">{chip}</span>
              </span>
            ))}
          </div>
        )}
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
        <p className="pl-1 text-sm font-semibold text-text-3">and {remaining} more</p>
      )}
    </div>
  );
}
