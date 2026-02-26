"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Book,
  Calendar,
  Coffee,
  Edit,
  Film,
  Heart,
  MapPin,
  MessageSquare,
  Music,
  Star,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import Navbar from "@/components/molecules/Navbar";
import Button from "@/components/atoms/Button";
import QuoteModal from "@/components/molecules/QuoteModal";
import { deleteProfile, getProfile } from "@/features/profiles/api";
import type { Profile } from "@/shared/types/profile";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/api/client";

function DetailSection({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="glass-panel rounded-2xl border-t border-white/10 p-8">
        <div className="mb-8 flex items-center gap-3 border-b border-white/5 pb-4">
          <div className="rounded-lg bg-[var(--color-primary-from)]/10 p-2 text-[var(--color-primary-from)]">
            <Icon className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{title}</h2>
        </div>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: LucideIcon;
}) {
  if (!value) return null;
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </div>
      <div className="text-lg font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}

function PillList({ items, colorClass = "bg-white/10" }: { items: string[]; colorClass?: string }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`${colorClass} rounded-full px-3 py-1 text-sm`}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function ProfileDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error } = useToast();
  const id = params?.id;
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery<Profile>({
    enabled: !!id,
    queryKey: ["profile", id],
    queryFn: () => getProfile(id),
  });

  const handleDelete = async () => {
    if (!id || !confirm("Are you sure you want to delete this profile? This cannot be undone."))
      return;
    try {
      await deleteProfile(id);
      success("Profile deleted successfully");
      router.push("/profiles");
    } catch (err: unknown) {
      error(getErrorMessage(err, "Failed to delete profile"));
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[var(--color-bg)]">
          <Navbar />
          <div className="mx-auto max-w-4xl px-4 py-12">
            <div className="glass-panel h-96 rounded-3xl bg-[var(--color-surface-highlight)]" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!profile || !id) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--color-bg)] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900">
        <Navbar />

        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 flex items-center justify-between"
          >
            <button
              onClick={() => router.push("/profiles")}
              className="group flex items-center gap-2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              <span className="text-lg">Back to Universe</span>
            </button>

            <div className="flex gap-3">
              <Button onClick={() => router.push(`/profiles/${id}/edit`)} variant="secondary">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button onClick={handleDelete} variant="destructive" className="!px-3">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel mb-12 rounded-3xl border-t border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8"
          >
            <div className="flex flex-col items-start gap-8 md:flex-row md:items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 text-4xl font-bold text-white shadow-lg shadow-indigo-500/20">
                {profile.full_name?.charAt(0) || "?"}
              </div>
              <div className="flex-1">
                <h1 className="mb-2 text-4xl font-bold text-white md:text-5xl">
                  {profile.full_name}
                </h1>
                <div className="flex flex-wrap gap-4 text-[var(--color-text-secondary)]">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm">
                    {profile.relationship_type}
                  </span>
                  {profile.birthday ? (
                    <span className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      {new Date(profile.birthday).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  ) : null}
                  {profile.zodiac_sign ? (
                    <span className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4" />
                      {profile.zodiac_sign}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {profile.bio ? (
              <div className="mt-8 rounded-2xl border border-white/5 bg-white/5 p-6">
                <p className="text-lg leading-relaxed text-[var(--color-text-secondary)]">
                  {profile.bio}
                </p>
              </div>
            ) : null}
          </motion.div>

          <div className="space-y-10">
            <DetailSection id="overview" title="Overview" icon={User}>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <Field label="Profession" value={profile.profession} />
                <Field label="Relationship" value={profile.relationship_type} />
                <Field
                  label="Birthday"
                  value={profile.birthday ? new Date(profile.birthday).toLocaleDateString() : null}
                />
                <Field label="Zodiac" value={profile.zodiac_sign} />
              </div>
            </DetailSection>

            <DetailSection id="favorites" title="Favorites & Interests" icon={Star}>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <Field label="Favorite Movie" value={profile.favorite_movie} icon={Film} />
                <Field label="Favorite Book" value={profile.favorite_book} icon={Book} />
                <Field label="Music Preference" value={profile.music_preference} icon={Music} />

                {profile.associated_song ? (
                  <div className="md:col-span-2 flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="rounded-full bg-rose-500/20 p-3 text-rose-300">
                      <Music className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                        Associated Song
                      </div>
                      <div className="text-lg font-medium">{profile.associated_song.name}</div>
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        {profile.associated_song.artist}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </DetailSection>

            <DetailSection id="lifestyle" title="Lifestyle" icon={Coffee}>
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <MapPin className="h-3 w-3" /> Hangout Places
                  </div>
                  <PillList items={profile.hangout_places.map((p) => p.place)} />
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <AlertCircle className="h-3 w-3" /> Food Restrictions
                  </div>
                  <PillList
                    items={profile.food_restrictions.map((r) => r.restriction)}
                    colorClass="border border-rose-500/20 bg-rose-500/10 text-rose-300"
                  />
                </div>
              </div>
            </DetailSection>

            <DetailSection id="deep" title="Deep Dive" icon={MessageSquare}>
              {profile.long_term_goals ? (
                <div>
                  <div className="mb-2 text-sm uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Long Term Goals
                  </div>
                  <p className="text-lg leading-relaxed">{profile.long_term_goals}</p>
                </div>
              ) : null}

              {profile.favorite_memory ? (
                <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/5 p-6">
                  <div className="mb-2 flex items-center gap-2 text-sm uppercase tracking-wider text-indigo-300">
                    <Heart className="h-4 w-4" /> Favorite Memory
                  </div>
                  <p className="text-lg font-serif italic leading-relaxed text-indigo-100">
                    &quot;{profile.favorite_memory}&quot;
                  </p>
                </div>
              ) : null}

              <div>
                <div className="mb-2 text-sm text-[var(--color-text-secondary)]">Quotes</div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {profile.quotes.map((q) => (
                    <button
                      key={q.id ?? q.quote}
                      onClick={() => setSelectedQuote(q.quote)}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 text-left font-serif italic"
                    >
                      &quot;{q.quote}&quot;
                    </button>
                  ))}
                </div>
              </div>
            </DetailSection>
          </div>
        </div>

        {selectedQuote ? (
          <QuoteModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
