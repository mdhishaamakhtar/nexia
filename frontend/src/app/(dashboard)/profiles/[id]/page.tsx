"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Book,
  Calendar,
  Coffee,
  Download,
  Edit,
  Film,
  Heart,
  ListMusic,
  Loader2,
  MapPin,
  MessageSquare,
  Music,
  Star,
  Trash2,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ConfirmDialog from "@/components/molecules/ConfirmDialog";
import Button from "@/components/atoms/Button";
import QuoteModal from "@/components/molecules/QuoteModal";
import ZodiacIcon from "@/features/profiles/components/ZodiacIcon";
import { deleteProfile, getProfile } from "@/features/profiles/api";
import { exportProfilePdf } from "@/features/profiles/exportProfilePdf";
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
      transition={{ type: "spring", stiffness: 140, damping: 22, delay: 0.1 + index * 0.08 }}
      id={id}
      className="scroll-mt-20 relative group"
    >
      <div
        className="washi-tape-accent w-20 opacity-30 group-hover:opacity-100 transition-opacity"
        style={{ background: index % 2 === 0 ? "var(--peach)" : "var(--lavender)", top: "-10px" }}
        aria-hidden="true"
      />

      <div className="glass-panel rounded-2xl p-6 sm:p-7 scrapbook-card">
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
  if (!hasText(value)) return null;
  const displayValue = value?.trim();

  return (
    <div className="mb-3">
      <div
        className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]"
        style={{ color: "var(--text-3)" }}
      >
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </div>
      <div className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
        {displayValue}
      </div>
    </div>
  );
}

function PillList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
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

function compactStrings(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, options);
}

function hasAssociatedSong(song?: Profile["associated_song"]) {
  return Boolean(song && (hasText(song.name) || hasText(song.artist)));
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
  const [isExporting, setIsExporting] = useState(false);

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
      error(await getErrorMessage(err, "Failed to delete profile"));
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-4">
        <div className="h-44 rounded-2xl shimmer" />
        <div className="h-28 rounded-2xl shimmer" />
        <div className="h-28 rounded-2xl shimmer" />
      </div>
    );
  }

  if (!profile || !id) return null;

  const birthdayShort = formatDate(profile.birthday, { month: "long", day: "numeric" });
  const birthdayFull = formatDate(profile.birthday);
  const tags = compactStrings(profile.tags?.map((tag) => tag.tag) ?? []);
  const movieGenres = compactStrings(profile.movie_genres?.map((genre) => genre.genre) ?? []);
  const bookGenres = compactStrings(profile.book_genres?.map((genre) => genre.genre) ?? []);
  const hangoutPlaces = compactStrings(profile.hangout_places?.map((place) => place.place) ?? []);
  const foodRestrictions = compactStrings(
    profile.food_restrictions?.map((restriction) => restriction.restriction) ?? []
  );
  const politicalViews = compactStrings(profile.political_views?.map((view) => view.view) ?? []);
  const quotes = (profile.quotes ?? []).filter((quote) => hasText(quote.quote));
  const topSongs = (profile.top_songs ?? []).filter(
    (song) => hasText(song.name) || hasText(song.artist)
  );
  const associatedSong = hasAssociatedSong(profile.associated_song)
    ? profile.associated_song
    : null;

  const hasOverview =
    hasText(profile.profession) ||
    Boolean(birthdayFull) ||
    hasText(profile.zodiac_sign) ||
    tags.length > 0;
  const hasFavorites =
    hasText(profile.favorite_movie) ||
    hasText(profile.favorite_book) ||
    hasText(profile.music_preference) ||
    Boolean(associatedSong) ||
    topSongs.length > 0 ||
    movieGenres.length > 0 ||
    bookGenres.length > 0;
  const hasLifestyle =
    hangoutPlaces.length > 0 || foodRestrictions.length > 0 || politicalViews.length > 0;
  const hasDeep =
    hasText(profile.long_term_goals) || hasText(profile.favorite_memory) || quotes.length > 0;

  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportProfilePdf(profile);
      success("PDF exported");
    } catch (err: unknown) {
      error(await getErrorMessage(err, "Failed to export PDF"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="profile-detail-page min-h-screen">
      <div className="profile-screen-root mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Back + Actions */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <Link
            href="/profiles"
            prefetch
            className="group flex items-center gap-2 transition-colors text-sm"
            style={{ color: "var(--text-3)" }}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            back
          </Link>

          <div className="flex items-center gap-2">
            <Link href={`/profiles/${id}/edit`} prefetch>
              <Button variant="secondary" className="text-xs px-3 py-2">
                <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
            </Link>
            <Button
              onClick={handleExportPdf}
              variant="secondary"
              className="px-3 py-2"
              aria-label="Export profile as PDF"
              title="Export PDF"
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </Button>
            <Button
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="destructive"
              className="px-3 py-2"
              aria-label="Delete profile"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </motion.div>

        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: -0.5 }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
          className="glass-panel mb-8 rounded-3xl p-8 sm:p-10 relative scrapbook-card"
        >
          <div
            className="washi-tape-accent w-32 h-8 -top-[15px]!"
            style={{ opacity: 0.7 }}
            aria-hidden="true"
          />

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div
              className="h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center rounded-2xl text-3xl sm:text-4xl font-semibold shrink-0 scrapbook-card -rotate-2"
              style={{ background: "var(--lavender)", color: "var(--text-1)" }}
            >
              {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
            </div>

            <div className="flex-1">
              <h1
                className="text-3xl sm:text-4xl font-semibold mb-2.5 leading-tight break-words"
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
                {birthdayShort && (
                  <span
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: "var(--text-3)" }}
                  >
                    <Calendar className="h-3 w-3" />
                    {birthdayShort}
                  </span>
                )}
                {profile.zodiac_sign && (
                  <span
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: "var(--text-3)" }}
                  >
                    <ZodiacIcon sign={profile.zodiac_sign} size={12} className="text-(--blue)" />
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
          {hasOverview && (
            <DetailSection id="overview" title="Overview" icon={User} index={0}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Profession" value={profile.profession} />
                <Field label="Birthday" value={birthdayFull} icon={Calendar} />
                <Field
                  label="Zodiac"
                  value={profile.zodiac_sign}
                  icon={() => (
                    <ZodiacIcon
                      sign={profile.zodiac_sign!}
                      size={12}
                      className="text-(--blue) mr-1"
                    />
                  )}
                />
              </div>
              {tags.length > 0 && (
                <div className="pt-1">
                  <div
                    className="mb-2 text-[11px] uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-3)" }}
                  >
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="text-xs px-2.5 py-1 rounded-full border"
                        style={{
                          background: "var(--fill)",
                          borderColor: "var(--border)",
                          color: "var(--text-3)",
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </DetailSection>
          )}

          {hasFavorites && (
            <DetailSection id="favorites" title="Favorites & Interests" icon={Star} index={1}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Favorite Movie" value={profile.favorite_movie} icon={Film} />
                <Field label="Favorite Book" value={profile.favorite_book} icon={Book} />
                <Field label="Music Preference" value={profile.music_preference} icon={Music} />
              </div>
              {associatedSong && (
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
                      className="text-[11px] uppercase tracking-[0.12em] mb-0.5"
                      style={{ color: "var(--text-3)" }}
                    >
                      Associated Song
                    </div>
                    {hasText(associatedSong.name) && (
                      <div className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                        {associatedSong.name}
                      </div>
                    )}
                    {hasText(associatedSong.artist) && (
                      <div className="text-xs" style={{ color: "var(--text-2)" }}>
                        {associatedSong.artist}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {topSongs.length > 0 && (
                <div>
                  <div
                    className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-3)" }}
                  >
                    <ListMusic className="h-3 w-3" /> Top Songs
                  </div>
                  <div className="space-y-2">
                    {topSongs.map((song, i) => (
                      <div
                        key={song.id ?? i}
                        className="flex items-center gap-3 rounded-xl p-3 border"
                        style={{ background: "var(--fill)", borderColor: "var(--border)" }}
                      >
                        <div
                          className="rounded-full shrink-0 text-xs font-bold w-7 h-7 flex items-center justify-center"
                          style={{ background: "var(--fill-hover)", color: "var(--text-3)" }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          {hasText(song.name) && (
                            <div
                              className="text-sm font-semibold"
                              style={{ color: "var(--text-1)" }}
                            >
                              {song.name}
                            </div>
                          )}
                          {hasText(song.artist) && (
                            <div className="text-xs" style={{ color: "var(--text-2)" }}>
                              {song.artist}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {movieGenres.length > 0 && (
                <div>
                  <div
                    className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-3)" }}
                  >
                    <Film className="h-3 w-3" /> Movie Genres
                  </div>
                  <PillList items={movieGenres} />
                </div>
              )}
              {bookGenres.length > 0 && (
                <div>
                  <div
                    className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-3)" }}
                  >
                    <Book className="h-3 w-3" /> Book Genres
                  </div>
                  <PillList items={bookGenres} />
                </div>
              )}
            </DetailSection>
          )}

          {hasLifestyle && (
            <DetailSection id="lifestyle" title="Lifestyle" icon={Coffee} index={2}>
              {hangoutPlaces.length > 0 && (
                <div>
                  <div
                    className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-3)" }}
                  >
                    <MapPin className="h-3 w-3" /> Hangout Places
                  </div>
                  <PillList items={hangoutPlaces} />
                </div>
              )}
              {foodRestrictions.length > 0 && (
                <div>
                  <div
                    className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-3)" }}
                  >
                    <AlertCircle className="h-3 w-3" /> Food Restrictions
                  </div>
                  <PillList items={foodRestrictions} />
                </div>
              )}
              {politicalViews.length > 0 && (
                <div>
                  <div
                    className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-3)" }}
                  >
                    <User className="h-3 w-3" /> Political Views
                  </div>
                  <PillList items={politicalViews} />
                </div>
              )}
            </DetailSection>
          )}

          {hasDeep && (
            <DetailSection id="deep" title="Deep Dive" icon={MessageSquare} index={3}>
              {profile.long_term_goals && (
                <div>
                  <div
                    className="mb-1.5 text-[11px] uppercase tracking-[0.12em]"
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
                    className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-3)" }}
                  >
                    <Heart className="h-3 w-3" /> Favorite Memory
                  </div>
                  <p className="text-sm italic leading-relaxed" style={{ color: "var(--text-1)" }}>
                    &ldquo;{profile.favorite_memory}&rdquo;
                  </p>
                </div>
              )}

              {quotes.length > 0 && (
                <div>
                  <div
                    className="mb-3 text-[11px] uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-3)" }}
                  >
                    Their Quotes
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {quotes.map((q) => (
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
          )}
        </div>
      </div>

      {selectedQuote && <QuoteModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />}
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
  );
}
