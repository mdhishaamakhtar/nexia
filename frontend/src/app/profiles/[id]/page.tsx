"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Heart,
  Star,
  Coffee,
  MessageSquare,
  Edit,
  Trash2,
  Calendar,
  Music,
  Book,
  Film,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import Navbar from "@/components/molecules/Navbar";
import Button from "@/components/atoms/Button";
import QuoteModal from "@/components/molecules/QuoteModal";
import api from "@/lib/api";

// Section Component for cleaner code
const DetailSection = ({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: any;
  children: React.ReactNode;
}) => (
  <div id={id} className="scroll-mt-24">
    <div className="glass-panel rounded-2xl p-8 border-t border-white/10">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
        <div className="p-2 bg-[var(--color-primary-from)]/10 rounded-lg text-[var(--color-primary-from)]">
          <Icon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{title}</h2>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  </div>
);

// Helper component for displaying a field
const Field = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | undefined | null;
  icon?: any;
}) => {
  if (!value) return null;
  return (
    <div className="mb-4">
      <div className="text-sm text-[var(--color-text-secondary)] mb-1 flex items-center gap-2">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className="text-lg font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
};

// Helper for tags/pills
const PillList = ({
  items,
  colorClass = "bg-white/10",
}: {
  items: string[];
  colorClass?: string;
}) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`${colorClass} px-3 py-1 rounded-full text-sm`}>
          {item}
        </span>
      ))}
    </div>
  );
};

export default function ProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/profiles/${id}`);
      setProfile(response.data);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      router.push("/profiles");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this profile? This cannot be undone.")) return;
    try {
      await api.delete(`/profiles/${id}`);
      router.push("/profiles");
    } catch (error) {
      console.error("Failed to delete profile:", error);
      alert("Failed to delete profile");
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[var(--color-bg)]">
          <Navbar />
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="glass-panel h-96 rounded-3xl animate-pulse bg-[var(--color-surface-highlight)]" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!profile) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--color-bg)] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900">
        <Navbar />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-12"
          >
            <button
              onClick={() => router.push("/profiles")}
              className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-lg">Back to Universe</span>
            </button>

            <div className="flex gap-3">
              <Button onClick={() => router.push(`/profiles/${id}/edit`)} variant="secondary">
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button onClick={handleDelete} variant="destructive" className="!px-3">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* Profile Header Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-3xl p-8 mb-12 border-t border-white/10 bg-gradient-to-br from-white/5 to-transparent"
          >
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-indigo-500/20">
                {profile.full_name?.charAt(0) || "?"}
              </div>
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {profile.full_name}
                </h1>
                <div className="flex flex-wrap gap-4 text-[var(--color-text-secondary)]">
                  {profile.relationship_type && (
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm">
                      {profile.relationship_type}
                    </span>
                  )}
                  {profile.birthday && (
                    <span className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      {new Date(profile.birthday).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {profile.zodiac_sign && (
                    <span className="flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4" />
                      {profile.zodiac_sign}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {profile.bio && (
              <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            )}
            {profile.tags && profile.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {profile.tags.map((t: any, i: number) => (
                  <span key={i} className="text-indigo-300 text-sm">
                    #{t.tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          <div className="space-y-10">
            {/* Overview / Basic Info */}
            <DetailSection id="overview" title="Overview" icon={User}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Field label="Profession" value={profile.profession} />
                <Field label="Relationship" value={profile.relationship_type} />
                <Field
                  label="Birthday"
                  value={profile.birthday ? new Date(profile.birthday).toLocaleDateString() : null}
                />
                <Field label="Zodiac" value={profile.zodiac_sign} />
              </div>
            </DetailSection>

            {/* Favorites & Interests */}
            <DetailSection id="favorites" title="Favorites & Interests" icon={Star}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Field label="Favorite Movie" value={profile.favorite_movie} icon={Film} />
                <Field label="Favorite Book" value={profile.favorite_book} icon={Book} />
                <Field label="Music Preference" value={profile.music_preference} icon={Music} />

                {profile.associated_song && (
                  <div className="md:col-span-2 p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-rose-500/20 rounded-full text-rose-300">
                      <Music className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                        Associated Song
                      </div>
                      <div className="font-medium text-lg">{profile.associated_song.name}</div>
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        {profile.associated_song.artist}
                      </div>
                    </div>
                  </div>
                )}

                {profile.top_songs && profile.top_songs.length > 0 && (
                  <div className="md:col-span-2">
                    <div className="text-sm text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
                      <Music className="w-3 h-3" /> Top Songs
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {profile.top_songs.map((song: any, i: number) => (
                        <div
                          key={i}
                          className="p-3 bg-white/5 rounded-lg border border-white/5 flex flex-col"
                        >
                          <span className="font-medium">{song.name}</span>
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {song.artist}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DetailSection>

            {/* Lifestyle */}
            <DetailSection id="lifestyle" title="Lifestyle" icon={Coffee}>
              <div className="space-y-6">
                {profile.hangout_places && profile.hangout_places.length > 0 && (
                  <div>
                    <div className="text-sm text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Hangout Places
                    </div>
                    <PillList items={profile.hangout_places.map((p: any) => p.place)} />
                  </div>
                )}

                {profile.food_restrictions && profile.food_restrictions.length > 0 && (
                  <div>
                    <div className="text-sm text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" /> Food Restrictions
                    </div>
                    <PillList
                      items={profile.food_restrictions.map((r: any) => r.restriction)}
                      colorClass="bg-rose-500/10 text-rose-300 border border-rose-500/20"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.movie_genres && profile.movie_genres.length > 0 && (
                    <div>
                      <div className="text-sm text-[var(--color-text-secondary)] mb-2">
                        Movie Genres
                      </div>
                      <PillList items={profile.movie_genres.map((g: any) => g.genre)} />
                    </div>
                  )}
                  {profile.book_genres && profile.book_genres.length > 0 && (
                    <div>
                      <div className="text-sm text-[var(--color-text-secondary)] mb-2">
                        Book Genres
                      </div>
                      <PillList items={profile.book_genres.map((g: any) => g.genre)} />
                    </div>
                  )}
                </div>
              </div>
            </DetailSection>

            {/* Deep Dive */}
            <DetailSection id="deep" title="Deep Dive" icon={MessageSquare}>
              <div className="space-y-8">
                {profile.long_term_goals && (
                  <div>
                    <div className="text-sm text-[var(--color-text-secondary)] mb-2 uppercase tracking-wider">
                      Long Term Goals
                    </div>
                    <p className="text-lg leading-relaxed">{profile.long_term_goals}</p>
                  </div>
                )}

                {profile.favorite_memory && (
                  <div className="p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                    <div className="text-sm text-indigo-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                      <Heart className="w-4 h-4" /> Favorite Memory
                    </div>
                    <p className="text-lg font-serif italic text-indigo-100 leading-relaxed">
                      "{profile.favorite_memory}"
                    </p>
                  </div>
                )}

                {profile.quotes && profile.quotes.length > 0 && (
                  <div>
                    <div className="text-sm text-[var(--color-text-secondary)] mb-4 uppercase tracking-wider">
                      Words They Said
                    </div>
                    <div className="columns-1 md:columns-2 gap-6 space-y-6">
                      {profile.quotes.map((q: any, i: number) => (
                        <motion.div
                          key={i}
                          whileHover={{ scale: 1.02, y: -5 }}
                          onClick={() => setSelectedQuote(q.quote)}
                          className="p-6 bg-white/5 rounded-xl border-l-4 border-indigo-400 break-inside-avoid cursor-pointer hover:shadow-lg hover:shadow-indigo-500/10 transition-all"
                        >
                          <p className="text-xl font-serif text-slate-300 line-clamp-1">
                            "{q.quote}"
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DetailSection>
          </div>
        </div>

        {selectedQuote && (
          <QuoteModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
        )}
      </div>
    </ProtectedRoute>
  );
}
