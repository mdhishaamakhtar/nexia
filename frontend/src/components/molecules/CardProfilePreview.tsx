import { Heart, Tag } from "lucide-react";

interface Profile {
    id: number;
    full_name: string;
    relationship_type: string;
    zodiac_sign?: string;
    tags?: { tag: string }[];
}

export default function CardProfilePreview({ profile, onClick }: { profile: Profile; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border-subtle)] hover:scale-[1.02] hover:border-[var(--color-accent)] transition-all duration-200 text-left group"
        >
            {/* Name */}
            <h3 className="text-xl font-semibold mb-2 group-hover:text-[var(--color-accent-cta)] transition-colors">
                {profile.full_name}
            </h3>

            {/* Relationship & Zodiac */}
            <div className="flex items-center gap-2 mb-3 text-sm text-[var(--color-text-secondary)]">
                <Heart className="w-4 h-4" />
                <span>{profile.relationship_type}</span>
                {profile.zodiac_sign && (
                    <>
                        <span>•</span>
                        <span>{profile.zodiac_sign}</span>
                    </>
                )}
            </div>

            {/* Tags Preview */}
            {profile.tags && profile.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-3 h-3 text-[var(--color-text-secondary)]" />
                    {profile.tags.slice(0, 3).map((tag, idx) => (
                        <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded-md bg-[var(--color-accent)]/20 text-[var(--color-text-secondary)]"
                        >
                            {tag.tag}
                        </span>
                    ))}
                    {profile.tags.length > 3 && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                            +{profile.tags.length - 3} more
                        </span>
                    )}
                </div>
            )}
        </button>
    );
}
