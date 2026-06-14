import Link from "next/link";
import { Heart, Tag } from "lucide-react";
import ZodiacIcon from "@/features/profiles/components/ZodiacIcon";
import { motion } from "framer-motion";
import type { ProfileSummary } from "@/shared/types/profile";

interface CardProfilePreviewProps {
  profile: ProfileSummary;
  href: string;
  index?: number;
}

export default function CardProfilePreview({ profile, href, index = 0 }: CardProfilePreviewProps) {
  return (
    <Link href={href} prefetch>
      <motion.div
        initial={{ opacity: 0, y: 18, rotate: index % 2 === 0 ? -1 : 1 }}
        animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -0.5 : 0.5 }}
        transition={{
          duration: 0.5,
          delay: Math.min(index, 8) * 0.08, // cap stagger at 9 cards (one viewport)
          type: "spring",
          stiffness: 150,
          damping: 18,
        }}
        whileHover={{
          y: -6,
          rotate: 0,
          scale: 1.02,
          transition: { type: "spring", stiffness: 400, damping: 20 },
        }}
        className="glass-card scrapbook-card cursor-pointer group rounded-2xl p-5 relative"
      >
        {/* Small Decorative Tape */}
        <div
          className="washi-tape-accent opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: index % 3 === 0 ? "var(--peach)" : "var(--lavender)",
            width: "40px",
            top: "-4px",
          }}
          aria-hidden="true"
        />

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 scrapbook-card"
            style={{
              background: ["var(--lavender)", "var(--blue)", "var(--peach)"][index % 3],
              color:
                index % 3 === 1 ? "white" : index % 3 === 2 ? "var(--peach-text)" : "var(--text-1)",
              transform: `rotate(${[-3, 3, -2][index % 3]}deg)`,
            }}
          >
            {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className="text-[15px] font-semibold leading-tight truncate transition-colors duration-200"
              style={{ color: "var(--text-1)" }}
            >
              {profile.full_name}
              {profile.pronouns && (
                <span
                  className="ml-1.5 text-[11px] font-medium lowercase tracking-wide"
                  style={{ color: "var(--text-3)" }}
                >
                  {profile.pronouns}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span
                className="sticker-chip inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border"
                style={{
                  color: "var(--text-2)",
                }}
              >
                <Heart className="w-2.5 h-2.5" />
                {profile.relationship_type}
              </span>
              {profile.zodiac_sign && (
                <span className="sticker-chip inline-flex items-center gap-1 px-2 py-0.5 text-[11px]">
                  <ZodiacIcon sign={profile.zodiac_sign} size={10} className="text-(--blue)" />
                  {profile.zodiac_sign}
                </span>
              )}
            </div>
          </div>
        </div>

        {profile.tags && profile.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {profile.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="sticker-tag inline-flex items-center gap-1 text-[11px] px-2 py-0.5"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag.tag}
              </span>
            ))}
            {profile.tags.length > 3 && (
              <span className="text-[11px] py-0.5 px-1" style={{ color: "var(--text-3)" }}>
                +{profile.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </motion.div>
    </Link>
  );
}
