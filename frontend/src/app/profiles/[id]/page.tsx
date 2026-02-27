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
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import Navbar from "@/components/molecules/Navbar";
import ConfirmDialog from "@/components/molecules/ConfirmDialog";
import Button from "@/components/atoms/Button";
import QuoteModal from "@/components/molecules/QuoteModal";
import ZodiacIcon from "@/features/profiles/components/ZodiacIcon";
import { deleteProfile, getProfile } from "@/features/profiles/api";
import type { Profile } from "@/shared/types/profile";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/api/client";

function DetailSection({
  id,
  title,
  icon: Icon,
  children,
  index = 0,
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -15, rotate: index % 2 === 0 ? -1 : 1 }}
      animate={{ opacity: 1, x: 0, rotate: index % 2 === 0 ? -0.5 : 0.5 }}
      transition={{ delay: 0.1 + index * 0.08, type: "spring", damping: 20 }}
      id={id}
      className="scroll-mt-20 relative group"
    >
      {/* Decorative Tape */}
      <div
        className="washi-tape-accent w-20 opacity-30 group-hover:opacity-100 transition-opacity"
        style={{ background: index % 2 === 0 ? "var(--peach)" : "var(--lavender)", top: "-10px" }}
      />

      <div className="glass-panel rounded-2xl p-6 sm:p-7 scrapbook-card overflow-hidden">
        <div className="mb-6 flex items-center gap-3">
          <div
            className="rounded-xl p-2"
            style={{ background: "var(--fill)", color: "var(--text-3)" }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <h2
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--text-3)" }}
          >
            {title}
          </h2>
        </div>
        <div className="space-y-5">{children}</div>
      </div>
    </motion.div>
  );
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ElementType;
}) {
  if (!value) return null;
  return (
    <div className="mb-3">
      <div
        className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em]"
        style={{ color: "var(--text-3)" }}
      >
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </div>
      <div className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
        {value}
      </div>
    </div>
  );
}

function PillList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full px-3 py-1 text-xs font-medium border"
          style={{
            background: "var(--fill)",
            borderColor: "var(--border)",
            color: "var(--text-2)",
          }}
        >
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
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: profile, isLoading } = useQuery<Profile>({
    enabled: !!id,
    queryKey: ["profile", id],
    queryFn: () => getProfile(id),
  });

  const handleDelete = async () => {
    if (!id || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteProfile(id);
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      await queryClient.removeQueries({ queryKey: ["profile", id] });
      success("Profile deleted");
      router.push("/profiles");
    } catch (err: unknown) {
      error(getErrorMessage(err, "Failed to delete profile"));
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Navbar />
          <div className="mx-auto max-w-3xl px-4 py-12 space-y-4">
            <div className="h-44 rounded-2xl shimmer" />
            <div className="h-28 rounded-2xl shimmer" />
            <div className="h-28 rounded-2xl shimmer" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!profile || !id) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Navbar />

        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Back + Actions */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center justify-between"
          >
            <button
              onClick={() => router.push("/profiles")}
              className="group flex items-center gap-2 transition-colors text-sm"
              style={{ color: "var(--text-3)" }}
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              back
            </button>

            <div className="flex gap-2">
              <Button
                onClick={() => router.push(`/profiles/${id}/edit`)}
                variant="secondary"
                className="text-xs px-3 py-2"
              >
                <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="destructive"
                className="px-3 py-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>

          {/* Hero Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotate: -0.5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="glass-panel mb-8 rounded-3xl p-8 sm:p-10 relative scrapbook-card"
          >
            {/* Big Washi Tape */}
            <div className="washi-tape-accent w-32 h-8 !top-[-15px]" style={{ opacity: 0.7 }} />

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div
                className="h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center rounded-2xl text-3xl sm:text-4xl font-semibold shrink-0 scrapbook-card rotate-[-2deg]"
                style={{ background: "var(--lavender)", color: "var(--text-1)" }}
              >
                {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
              </div>

              <div className="flex-1">
                <h1
                  className="text-3xl sm:text-4xl font-semibold mb-2.5 leading-tight"
                  style={{ color: "var(--text-1)" }}
                >
                  {profile.full_name}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium border"
                    style={{
                      color: "var(--text-2)",
                      background: "var(--fill)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <Heart className="h-3 w-3" />
                    {profile.relationship_type}
                  </span>
                  {profile.birthday && (
                    <span
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: "var(--text-3)" }}
                    >
                      <Calendar className="h-3 w-3" />
                      {new Date(profile.birthday).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {profile.zodiac_sign && (
                    <span
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: "var(--text-3)" }}
                    >
                      <ZodiacIcon
                        sign={profile.zodiac_sign}
                        size={12}
                        className="text-[var(--blue)]"
                      />
                      {profile.zodiac_sign}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {profile.bio && (
              <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm leading-relaxed italic" style={{ color: "var(--text-2)" }}>
                  &ldquo;{profile.bio}&rdquo;
                </p>
              </div>
            )}
          </motion.div>

          {/* Sections */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <DetailSection id="overview" title="Overview" icon={User} index={0}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Profession" value={profile.profession} />
                  <Field
                    label="Birthday"
                    value={
                      profile.birthday ? new Date(profile.birthday).toLocaleDateString() : null
                    }
                    icon={Calendar}
                  />
                  <Field
                    label="Zodiac"
                    value={profile.zodiac_sign}
                    icon={() => (
                      <ZodiacIcon
                        sign={profile.zodiac_sign!}
                        size={12}
                        className="text-[var(--blue)] mr-1"
                      />
                    )}
                  />
                </div>
                {profile.tags && profile.tags.length > 0 && (
                  <div className="pt-1">
                    <div
                      className="mb-2 text-[10px] uppercase tracking-[0.12em]"
                      style={{ color: "var(--text-3)" }}
                    >
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.tags.map((t, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-full border"
                          style={{
                            background: "var(--fill)",
                            borderColor: "var(--border)",
                            color: "var(--text-3)",
                          }}
                        >
                          #{t.tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </DetailSection>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <DetailSection id="favorites" title="Favorites & Interests" icon={Star} index={1}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Favorite Movie" value={profile.favorite_movie} icon={Film} />
                  <Field label="Favorite Book" value={profile.favorite_book} icon={Book} />
                  <Field label="Music Preference" value={profile.music_preference} icon={Music} />
                </div>
                {profile.associated_song && (
                  <div
                    className="flex items-center gap-4 rounded-xl p-4 mt-1 border"
                    style={{
                      background: "var(--fill)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div
                      className="rounded-full p-2.5 shrink-0"
                      style={{ background: "var(--fill-hover)", color: "var(--text-2)" }}
                    >
                      <Music className="h-4 w-4" />
                    </div>
                    <div>
                      <div
                        className="text-[9px] uppercase tracking-[0.18em] mb-0.5"
                        style={{ color: "var(--text-3)" }}
                      >
                        Associated Song
                      </div>
                      <div className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                        {profile.associated_song.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-2)" }}>
                        {profile.associated_song.artist}
                      </div>
                    </div>
                  </div>
                )}
              </DetailSection>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <DetailSection id="lifestyle" title="Lifestyle" icon={Coffee} index={2}>
                {profile.hangout_places.length > 0 && (
                  <div>
                    <div
                      className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em]"
                      style={{ color: "var(--text-3)" }}
                    >
                      <MapPin className="h-3 w-3" /> Hangout Places
                    </div>
                    <PillList items={profile.hangout_places.map((p) => p.place)} />
                  </div>
                )}
                {profile.food_restrictions.length > 0 && (
                  <div>
                    <div
                      className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em]"
                      style={{ color: "var(--text-3)" }}
                    >
                      <AlertCircle className="h-3 w-3" /> Food Restrictions
                    </div>
                    <PillList items={profile.food_restrictions.map((r) => r.restriction)} />
                  </div>
                )}
              </DetailSection>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <DetailSection id="deep" title="Deep Dive" icon={MessageSquare} index={3}>
                {profile.long_term_goals && (
                  <div>
                    <div
                      className="mb-1.5 text-[10px] uppercase tracking-[0.12em]"
                      style={{ color: "var(--text-3)" }}
                    >
                      Long-Term Goals
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                      {profile.long_term_goals}
                    </p>
                  </div>
                )}

                {profile.favorite_memory && (
                  <div
                    className="rounded-xl p-5 border"
                    style={{
                      background: "var(--fill)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div
                      className="mb-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em]"
                      style={{ color: "var(--text-3)" }}
                    >
                      <Heart className="h-3 w-3" /> Favorite Memory
                    </div>
                    <p
                      className="text-sm italic leading-relaxed"
                      style={{ color: "var(--text-1)" }}
                    >
                      &ldquo;{profile.favorite_memory}&rdquo;
                    </p>
                  </div>
                )}

                {profile.quotes && profile.quotes.length > 0 && (
                  <div>
                    <div
                      className="mb-3 text-[10px] uppercase tracking-[0.12em]"
                      style={{ color: "var(--text-3)" }}
                    >
                      Their Quotes
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {profile.quotes.map((q) => (
                        <button
                          key={q.id ?? q.quote}
                          onClick={() => setSelectedQuote(q.quote)}
                          className="rounded-xl p-4 text-left italic text-sm transition-all duration-200 hover:scale-[1.01] border"
                          style={{
                            background: "var(--fill)",
                            borderColor: "var(--border)",
                            color: "var(--text-2)",
                          }}
                        >
                          &ldquo;{q.quote}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </DetailSection>
            </motion.div>
          </div>
        </div>

        {selectedQuote && (
          <QuoteModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
        )}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          title="Delete Profile?"
          description="This action is permanent and cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteDialogOpen(false)}
          isConfirming={isDeleting}
        />
      </div>
    </ProtectedRoute>
  );
}
