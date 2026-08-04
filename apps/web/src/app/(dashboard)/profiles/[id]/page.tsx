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
import PageShell from "@/components/layout/PageShell";
import QuoteModal from "@/components/molecules/QuoteModal";
import ZodiacIcon from "@/features/profiles/components/ZodiacIcon";
import { deleteProfile, getProfile } from "@/features/profiles/api";
import { exportProfilePdf } from "@/features/profiles/exportProfilePdf";
import type { Profile } from "@/shared/types/profile";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/api/client";

const HERO_TAPES = [
  "var(--peach)",
  "var(--lavender)",
  "var(--blue)",
  "var(--lavender)",
  "var(--peach)",
];

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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.06 + index * 0.06 }}
      id={id}
      aria-labelledby={`${id}-heading`}
      className="paper scroll-mt-24 rounded-3xl p-5 sm:p-7"
    >
      <header className="mb-5 flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <h2 id={`${id}-heading`} className="t-label">
          {title}
        </h2>
      </header>
      <div className="space-y-6">{children}</div>
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
      <dt className="t-label mb-1 flex items-center gap-1.5">
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
    <div className="t-label mb-2.5 flex items-center gap-1.5">
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
          className="sticker-chip max-w-full break-words px-3 py-1 text-xs font-semibold"
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
      className="paper-sunk flex h-full flex-col rounded-2xl p-4 text-left text-sm leading-relaxed transition-colors duration-150 hover:bg-(--surface-3)"
      style={{ color: "var(--text-2)" }}
    >
      <span ref={textRef} className="line-clamp-3 break-words">
        {quote}
      </span>
      {isClamped && (
        <span
          className="mt-1.5 text-xs font-semibold underline underline-offset-2"
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
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
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
      // Same shell and padding as the loaded state, so nothing shifts on arrival.
      <div className="page-body">
        <PageShell width="reading" className="space-y-4 py-8 sm:py-10">
          <div className="shimmer h-14 rounded-2xl" />
          <div className="shimmer h-48 rounded-3xl" />
          <div className="shimmer h-32 rounded-3xl" />
        </PageShell>
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
  const favoriteMemories = (profile.favorite_memories ?? []).filter((m) => hasText(m.memory));
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
    favoriteMemories.length > 0 ||
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
    <div className="profile-detail-page page-body">
      <PageShell width="reading" as="main" className="profile-screen-root py-8 sm:py-10">
        {/* Back + Actions */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 flex items-center justify-between gap-3"
        >
          <BackButton href="/profiles" label="Back" />

          <div className="flex items-center gap-2">
            <Link href={`/profiles/${id}/edit`} prefetch>
              <Button variant="secondary" size="sm">
                <Edit className="h-3.5 w-3.5" aria-hidden="true" /> Edit
              </Button>
            </Link>
            <Button
              onClick={handleExportPdf}
              variant="secondary"
              size="sm"
              className="w-11 px-0"
              aria-label="Export profile as PDF"
              title="Export PDF"
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <Button
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="destructive"
              size="sm"
              className="w-11 px-0"
              aria-label="Delete profile"
              title="Delete profile"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </motion.div>

        {/* Hero. The one washi-tape moment on the page — the sections below stay
            plain so the decoration reads as emphasis rather than wallpaper. */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="paper relative mb-5 rounded-[28px] p-6 sm:p-9"
        >
          {/* Same id-keyed tape as this person's card in the grid, so the
              profile you tapped is the profile you land on. */}
          <span
            className="washi-tape h-7 w-28"
            style={{
              background: HERO_TAPES[Number(id) % HERO_TAPES.length],
              transform: `translateX(-50%) rotate(${(Number(id) % 2 ? 1.6 : -1.8).toFixed(1)}deg)`,
            }}
            aria-hidden="true"
          />

          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
            <span
              className="flex h-20 w-20 shrink-0 -rotate-3 items-center justify-center rounded-2xl text-4xl font-extrabold sm:h-24 sm:w-24"
              style={{ background: "var(--lavender)", color: "var(--lavender-ink)" }}
              aria-hidden="true"
            >
              {initial}
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="t-page-title mb-1 break-words" style={{ color: "var(--text-1)" }}>
                {profile.full_name}
              </h1>
              {profile.pronouns && (
                <p
                  className="mb-2.5 text-sm font-semibold lowercase"
                  style={{ color: "var(--text-3)" }}
                >
                  {profile.pronouns}
                </p>
              )}
              <div
                className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold"
                style={{ color: "var(--text-3)" }}
              >
                <span
                  className="sticker-chip inline-flex items-center gap-1.5 px-2.5 py-1"
                  style={{ color: "var(--text-2)" }}
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
                    <ZodiacIcon
                      sign={profile.zodiac_sign}
                      size={12}
                      className="text-(--blue-ink)"
                    />
                    {profile.zodiac_sign}
                  </span>
                )}
              </div>
            </div>
          </div>

          {profile.bio && (
            <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--border)" }}>
              <p className="t-body whitespace-pre-line" style={{ color: "var(--text-2)" }}>
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
                    <ZodiacIcon
                      sign={profile.zodiac_sign!}
                      size={12}
                      className="text-(--blue-ink)"
                    />
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
                <div className="paper-sunk flex items-center gap-4 rounded-2xl p-4">
                  <div
                    className="shrink-0 rounded-full p-2.5"
                    style={{ background: "var(--surface-3)", color: "var(--text-2)" }}
                  >
                    <Music className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="t-label mb-0.5">Associated song</div>
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
                        className="paper-sunk flex items-center gap-3 rounded-2xl p-3"
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{ background: "var(--surface-3)", color: "var(--text-2)" }}
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

              {favoriteMemories.length > 0 && (
                <div>
                  <SubLabel icon={Heart}>Favorite Memories</SubLabel>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {favoriteMemories.map((m) => (
                      <QuoteCard
                        key={m.id ?? m.memory}
                        quote={m.memory}
                        onOpen={() => setSelectedMemory(m.memory)}
                      />
                    ))}
                  </div>
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
      </PageShell>

      <AnimatePresence>
        {selectedQuote && (
          <QuoteModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
        )}
        {selectedMemory && (
          <QuoteModal
            quote={selectedMemory}
            title="a memory worth keeping"
            onClose={() => setSelectedMemory(null)}
          />
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
