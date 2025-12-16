import { Heart, Hash } from "lucide-react";
import { motion } from "framer-motion";

interface Profile {
  id: number;
  full_name: string;
  relationship_type: string;
  zodiac_sign?: string;
  tags?: { tag: string }[];
}

interface CardProfilePreviewProps {
  profile: Profile;
  onClick: () => void;
  index?: number;
}

export default function CardProfilePreview({
  profile,
  onClick,
  index = 0,
}: CardProfilePreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{
        y: -5,
        scale: 1.02,
        transition: { type: "spring", stiffness: 400, damping: 17 },
      }}
      onClick={onClick}
      className="glass-panel rounded-2xl p-6 cursor-pointer group hover:border-[var(--color-primary-from)]/50 relative overflow-hidden break-inside-avoid mb-6"
    >
      {/* Gradient Blob Background */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[var(--color-primary-from)]/10 rounded-full blur-3xl group-hover:bg-[var(--color-primary-from)]/20 transition-all duration-500" />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-purple-400 transition-all duration-300">
              {profile.full_name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-surface-highlight)] border border-[var(--color-border-subtle)]">
                <Heart className="w-3 h-3 text-rose-400" />
                {profile.relationship_type}
              </span>
              {profile.zodiac_sign && (
                <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-highlight)] border border-[var(--color-border-subtle)]">
                  {profile.zodiac_sign}
                </span>
              )}
            </div>
          </div>
        </div>

        {profile.tags && profile.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {profile.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--color-bg)]/50 text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
              >
                <Hash className="w-3 h-3 opacity-50" />
                {tag.tag}
              </span>
            ))}
            {profile.tags.length > 3 && (
              <span className="text-xs text-[var(--color-text-secondary)] py-1">
                +{profile.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
