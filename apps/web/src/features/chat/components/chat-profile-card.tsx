import Link from "next/link";
import { Heart, Tag, ArrowUpRight } from "lucide-react";
import ZodiacIcon from "@/features/profiles/components/ZodiacIcon";
import type { Profile } from "@/shared/types/profile";

interface ChatProfileCardProps {
  profile: Profile;
  index?: number;
}

export function ChatProfileCard({ profile, index = 0 }: ChatProfileCardProps) {
  const accentColors = ["var(--lavender)", "var(--blue)", "var(--peach)"];
  const accent = accentColors[index % 3];

  return (
    <Link href={`/profiles/${profile.id}`} prefetch className="block">
      <div
        className="group/card flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all hover:bg-(--fill) active:scale-[0.99]"
        style={{
          borderColor: "var(--border)",
          background: "var(--fill)",
        }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-extrabold text-base"
          style={{
            background: accent,
            color:
              index % 3 === 1 ? "white" : index % 3 === 2 ? "var(--peach-text)" : "var(--text-1)",
            transform: `rotate(${[-2, 2, -1][index % 3]}deg)`,
          }}
        >
          {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
              {profile.full_name}
            </span>
            <ArrowUpRight
              size={13}
              className="shrink-0 opacity-0 transition-opacity group-hover/card:opacity-60"
              style={{ color: "var(--text-3)" }}
            />
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium"
              style={{ color: "var(--text-3)" }}
            >
              <Heart size={11} />
              {profile.relationship_type}
            </span>
            {profile.zodiac_sign && (
              <>
                <span style={{ color: "var(--border-mid)" }}>·</span>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium"
                  style={{ color: "var(--text-3)" }}
                >
                  <ZodiacIcon sign={profile.zodiac_sign} size={11} className="text-(--blue)" />
                  {profile.zodiac_sign}
                </span>
              </>
            )}
          </div>
        </div>

        {profile.tags && profile.tags.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1.5 justify-end">
            {profile.tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="sticker-tag inline-flex items-center gap-1 text-[10px] px-2 py-0.5"
              >
                <Tag size={9} />
                {tag.tag}
              </span>
            ))}
            {profile.tags.length > 2 && (
              <span className="text-[10px] font-medium" style={{ color: "var(--text-3)" }}>
                +{profile.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

interface ChatProfileListProps {
  profiles: Profile[];
  max?: number;
}

export function ChatProfileList({ profiles, max = 3 }: ChatProfileListProps) {
  const visible = profiles.slice(0, max);
  const remaining = profiles.length - visible.length;

  return (
    <div className="flex flex-col gap-2">
      {visible.map((profile, i) => (
        <ChatProfileCard key={profile.id} profile={profile} index={i} />
      ))}
      {remaining > 0 && (
        <span className="text-[11px] font-medium pl-3 pt-1" style={{ color: "var(--text-3)" }}>
          +{remaining} more
        </span>
      )}
    </div>
  );
}
