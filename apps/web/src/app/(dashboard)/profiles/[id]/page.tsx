"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
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
  Quote,
  Star,
  Trash2,
  User,
  Vote,
  Utensils,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ConfirmDialog from "@/components/molecules/ConfirmDialog";
import Button from "@/components/atoms/Button";
import BackButton from "@/components/atoms/BackButton";
import QuoteModal from "@/components/molecules/QuoteModal";
import ZodiacIcon from "@/features/profiles/components/ZodiacIcon";
import { deleteProfile, getProfile } from "@/features/profiles/api";
import { exportProfilePdf } from "@/features/profiles/exportProfilePdf";
import type { Profile } from "@/shared/types/profile";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/api/client";

function Section({
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
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 150, damping: 22, delay: 0.08 + index * 0.07 }}
      id={id}
      className="scroll-mt-24"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-7">
        <header className="mb-5 flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "var(--fill)", color: "var(--text-2)" }}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <h2
            className="text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "var(--text-3)" }}
          >
            {title}
          </h2>
        </header>
        <div className="space-y-6">{children}</div>
      </div>
    </motion.section>
  );
}

function Fact({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ElementType;
}) {
  if (!hasText(value)) return null;
  return (
    <div className="min-w-0">
      <dt
        className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--text-3)" }}
      >
        {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
        {label}
      </dt>
      <dd className="break-words text-sm font-semibold" style={{ color: "var(--text-1)" }}>
        {value?.trim()}
      </dd>
    </div>
  );
}

function SubLabel({
  icon: Icon,
  children,
}: {
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={{ color: "var(--text-3)" }}
    >
      {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {children}
    </div>
  );
}

function ChipGroup({ items, prefix = "" }: { items: string[]; prefix?: string }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="max-w-full break-words rounded-full border px-3 py-1 text-xs font-medium"
          style={{
            background: "var(--fill)",
            borderColor: "var(--border)",
            color: "var(--text-2)",
          }}
        >
          {prefix}
          {item}
        </span>
      ))}
    </div>
  );
}

function QuoteCard({ quote, onOpen }: { quote: string; onOpen: () => void }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const check = () => setIsClamped(el.scrollHeight - el.clientHeight > 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [quote]);

  return (
    <button
      onClick={onOpen}
      title="Read full quote"
      className="flex h-full flex-col rounded-2xl border p-4 text-left text-sm italic leading-relaxed transition-all duration-200 hover:scale-[1.01]"
      style={{
        background: "var(--fill)",
        borderColor: "var(--border)",
        color: "var(--text-2)",
      }}
    >
      <span ref={textRef} className="line-clamp-3 break-words">
        &ldquo;{quote}&rdquo;
      </span>
      {isClamped && (
        <span
          className="mt-1.5 text-xs font-semibold not-italic underline underline-offset-2"
          style={{ color: "var(--text-3)" }}
        >
          more
        </span>
      )}
    </button>
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
  if (options) {
    return date.toLocaleDateString(undefined, options);
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 sm:px-6 lg:px-8">
        <div className="shimmer h-48 rounded-3xl" />
        <div className="shimmer h-32 rounded-3xl" />
        <div className="shimmer h-32 rounded-3xl" />
      </div>
    );
  }

  if (!profile || !id) return null;

  const initial = profile.full_name?.charAt(0)?.toUpperCase() || "?";
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
    hasText(profile.long_term_goals) ||
    hasText(profile.favorite_memory) ||
    hasText(profile.notes) ||
    quotes.length > 0;

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
      <div className="profile-screen-root mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Back + Actions */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between gap-3"
        >
          <BackButton href="/profiles" label="Back" />

          <div className="flex items-center gap-2">
            <Link href={`/profiles/${id}/edit`} prefetch>
              <Button variant="secondary" className="px-3.5 py-2 text-xs">
                <Edit className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Edit
              </Button>
            </Link>
            <Button
              onClick={handleExportPdf}
              variant="secondary"
              className="px-2.5 py-2"
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
              className="px-2.5 py-2"
              aria-label="Delete profile"
              title="Delete profile"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </motion.div>

        {/* Hero / Cover */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 22 }}
          className="glass-panel relative mb-5 rounded-[28px] p-7 sm:p-9"
        >
          <div className="washi-tape-accent h-7 w-28" style={{ opacity: 0.7 }} aria-hidden="true" />

          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
            <div
              className="flex h-20 w-20 shrink-0 -rotate-3 items-center justify-center rounded-2xl text-4xl font-bold sm:h-24 sm:w-24"
              style={{ background: "var(--lavender)", color: "var(--text-1)" }}
            >
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <h1
                className="mb-2.5 break-words text-3xl font-bold leading-tight sm:text-[2.5rem]"
                style={{ color: "var(--text-1)" }}
              >
                {profile.full_name}
              </h1>
              <div
                className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs"
                style={{ color: "var(--text-3)" }}
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold"
                  style={{
                    color: "var(--text-2)",
                    background: "var(--fill)",
                    borderColor: "var(--border)",
                  }}
                >
                  <Heart className="h-3 w-3" aria-hidden="true" />
                  {profile.relationship_type}
                </span>
                {birthdayShort && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    {birthdayShort}
                  </span>
                )}
                {profile.zodiac_sign && (
                  <span className="inline-flex items-center gap-1.5">
                    <ZodiacIcon sign={profile.zodiac_sign} size={12} className="text-(--blue)" />
                    {profile.zodiac_sign}
                  </span>
                )}
              </div>
            </div>
          </div>

          {profile.bio && (
            <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--border)" }}>
              <p
                className="whitespace-pre-line text-[15px] leading-relaxed"
                style={{ color: "var(--text-2)" }}
              >
                {profile.bio}
              </p>
            </div>
          )}
        </motion.header>

        {/* Sections */}
        <div className="space-y-5">
          {hasOverview && (
            <Section id="overview" title="Overview" icon={User} index={0}>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <Fact label="Profession" value={profile.profession} />
                <Fact label="Birthday" value={birthdayFull} icon={Calendar} />
                <Fact
                  label="Zodiac"
                  value={profile.zodiac_sign}
                  icon={() => (
                    <ZodiacIcon sign={profile.zodiac_sign!} size={12} className="text-(--blue)" />
                  )}
                />
              </dl>
              {tags.length > 0 && (
                <div>
                  <SubLabel>Tags</SubLabel>
                  <ChipGroup items={tags} prefix="#" />
                </div>
              )}
            </Section>
          )}

          {hasFavorites && (
            <Section id="favorites" title="Favorites & Interests" icon={Star} index={1}>
              {(hasText(profile.favorite_movie) ||
                hasText(profile.favorite_book) ||
                hasText(profile.music_preference)) && (
                <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                  <Fact label="Favorite Movie" value={profile.favorite_movie} icon={Film} />
                  <Fact label="Favorite Book" value={profile.favorite_book} icon={Book} />
                  <Fact label="Music Preference" value={profile.music_preference} icon={Music} />
                </dl>
              )}

              {associatedSong && (
                <div
                  className="flex items-center gap-4 rounded-2xl border p-4"
                  style={{ background: "var(--fill)", borderColor: "var(--border)" }}
                >
                  <div
                    className="shrink-0 rounded-full p-2.5"
                    style={{ background: "var(--fill-hover)", color: "var(--text-2)" }}
                  >
                    <Music className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                      style={{ color: "var(--text-3)" }}
                    >
                      Associated Song
                    </div>
                    {hasText(associatedSong.name) && (
                      <div
                        className="break-words text-sm font-semibold"
                        style={{ color: "var(--text-1)" }}
                      >
                        {associatedSong.name}
                      </div>
                    )}
                    {hasText(associatedSong.artist) && (
                      <div className="break-words text-xs" style={{ color: "var(--text-2)" }}>
                        {associatedSong.artist}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {topSongs.length > 0 && (
                <div>
                  <SubLabel icon={ListMusic}>Top Songs</SubLabel>
                  <div className="space-y-2">
                    {topSongs.map((song, i) => (
                      <div
                        key={song.id ?? i}
                        className="flex items-center gap-3 rounded-2xl border p-3"
                        style={{ background: "var(--fill)", borderColor: "var(--border)" }}
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{ background: "var(--fill-hover)", color: "var(--text-3)" }}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          {hasText(song.name) && (
                            <div
                              className="break-words text-sm font-semibold"
                              style={{ color: "var(--text-1)" }}
                            >
                              {song.name}
                            </div>
                          )}
                          {hasText(song.artist) && (
                            <div className="break-words text-xs" style={{ color: "var(--text-2)" }}>
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
                  <SubLabel icon={Film}>Movie Genres</SubLabel>
                  <ChipGroup items={movieGenres} />
                </div>
              )}
              {bookGenres.length > 0 && (
                <div>
                  <SubLabel icon={Book}>Book Genres</SubLabel>
                  <ChipGroup items={bookGenres} />
                </div>
              )}
            </Section>
          )}

          {hasLifestyle && (
            <Section id="lifestyle" title="Lifestyle" icon={Coffee} index={2}>
              {hangoutPlaces.length > 0 && (
                <div>
                  <SubLabel icon={MapPin}>Hangout Places</SubLabel>
                  <ChipGroup items={hangoutPlaces} />
                </div>
              )}
              {foodRestrictions.length > 0 && (
                <div>
                  <SubLabel icon={Utensils}>Food Restrictions</SubLabel>
                  <ChipGroup items={foodRestrictions} />
                </div>
              )}
              {politicalViews.length > 0 && (
                <div>
                  <SubLabel icon={Vote}>Political Views</SubLabel>
                  <ChipGroup items={politicalViews} />
                </div>
              )}
            </Section>
          )}

          {hasDeep && (
            <Section id="deep" title="Deep Dive" icon={MessageSquare} index={3}>
              {profile.long_term_goals && (
                <div>
                  <SubLabel>Long-Term Goals</SubLabel>
                  <p
                    className="whitespace-pre-line text-sm leading-relaxed"
                    style={{ color: "var(--text-2)" }}
                  >
                    {profile.long_term_goals}
                  </p>
                </div>
              )}

              {profile.favorite_memory && (
                <div
                  className="rounded-2xl border p-5"
                  style={{ background: "var(--fill)", borderColor: "var(--border)" }}
                >
                  <SubLabel icon={Heart}>Favorite Memory</SubLabel>
                  <p
                    className="whitespace-pre-line text-sm leading-relaxed"
                    style={{ color: "var(--text-1)" }}
                  >
                    {profile.favorite_memory}
                  </p>
                </div>
              )}

              {profile.notes && (
                <div>
                  <SubLabel>Additional Notes</SubLabel>
                  <p
                    className="whitespace-pre-line text-sm leading-relaxed"
                    style={{ color: "var(--text-2)" }}
                  >
                    {profile.notes}
                  </p>
                </div>
              )}

              {quotes.length > 0 && (
                <div>
                  <SubLabel icon={Quote}>Their Quotes</SubLabel>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {quotes.map((q) => (
                      <QuoteCard
                        key={q.id ?? q.quote}
                        quote={q.quote}
                        onOpen={() => setSelectedQuote(q.quote)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedQuote && (
          <QuoteModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
        )}
      </AnimatePresence>
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
