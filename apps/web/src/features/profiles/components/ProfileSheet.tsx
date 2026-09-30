"use client";

import type { ProfileOutput } from "@nexia/shared";
import { useRef, useState, type ElementType, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Book,
  Calendar,
  Film,
  Heart,
  ListMusic,
  MapPin,
  Music,
  Quote,
  Utensils,
  Vote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Tape from "@/components/atoms/Tape";
import QuoteModal from "@/components/molecules/QuoteModal";
import { useIsClamped } from "@/shared/hooks/use-is-clamped";
import { ageOn, formatDate } from "@/shared/lib/dates";
import { enter } from "@/shared/ui/motion";
import { FIELD_LABELS, PROFILE_SECTIONS, RANK_TINTS, type ProfileFieldKey } from "../sections";
import { tapeFor } from "../identity";
import Avatar from "./Avatar";
import SheetSection from "./SheetSection";
import ZodiacIcon from "./ZodiacIcon";

function hasText(value?: string | null): value is string {
  return Boolean(value?.trim());
}

function Label({ icon: Icon, children }: { icon?: ElementType; children: ReactNode }) {
  return (
    <p className="t-label mb-2.5 flex items-center gap-1.5">
      {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {children}
    </p>
  );
}

function Fact({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ElementType;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <Label icon={icon}>{label}</Label>
      <p className="break-words text-sm font-semibold text-text-1">{children}</p>
    </div>
  );
}

/** Neutral paper chips: the rest bar between the coloured things on the sheet. */
function Chips({
  label,
  icon,
  items,
  tag = false,
}: {
  label: string;
  icon?: ElementType;
  items: string[];
  tag?: boolean;
}) {
  return (
    <div>
      <Label icon={icon}>{label}</Label>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className={cn(
              "max-w-full break-words px-3 py-1 text-xs font-semibold",
              tag ? "sticker-tag" : "sticker-chip"
            )}
          >
            {tag ? `#${item}` : item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Prose({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="t-body whitespace-pre-line text-text-2">{text}</p>
    </div>
  );
}

/**
 * Something the person said — the one device on the sheet that means "their
 * words, not yours", which is why memories and notes don't get the mark.
 */
function QuoteBubble({ quote, onOpen }: { quote: string; onOpen: () => void }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const clamped = useIsClamped(textRef, quote);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={clamped ? `Read the whole quote: ${quote.slice(0, 60)}` : undefined}
      className="relative flex h-full flex-col rounded-2xl border border-lavender-line bg-lavender-soft py-4 pl-12 pr-4 text-left text-sm leading-relaxed text-text-2 transition-colors hover:border-lavender"
    >
      <span
        aria-hidden="true"
        className="t-page-title pointer-events-none absolute left-3.5 top-2 select-none leading-none text-lavender-ink/40"
      >
        &ldquo;
      </span>
      <span ref={textRef} className="line-clamp-3 break-words">
        {quote}
      </span>
      {clamped && (
        <span className="mt-1.5 text-xs font-semibold text-lavender-ink underline underline-offset-2">
          Read all
        </span>
      )}
    </button>
  );
}

/** A memory is yours, not theirs — a quiet paper well, no speech mark. */
function MemoryCard({ memory, onOpen }: { memory: string; onOpen: () => void }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const clamped = useIsClamped(textRef, memory);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="paper-sunk flex h-full flex-col rounded-2xl p-4 text-left text-sm leading-relaxed text-text-2 transition-colors hover:bg-surface-3"
    >
      <span ref={textRef} className="line-clamp-3 break-words">
        {memory}
      </span>
      {clamped && (
        <span className="mt-1.5 text-xs font-semibold text-text-3 underline underline-offset-2">
          Read all
        </span>
      )}
    </button>
  );
}

interface RenderContext {
  profile: ProfileOutput;
  openQuote: (text: string) => void;
  openMemory: (text: string) => void;
}

/**
 * How each field reads on the sheet, and whether it has anything to show.
 * Empty fields are left out rather than shown as placeholders.
 */
const RENDERERS: Record<
  ProfileFieldKey,
  { has: (p: ProfileOutput) => boolean; render: (c: RenderContext) => ReactNode; wide?: boolean }
> = {
  profession: {
    has: (p) => hasText(p.profession),
    render: ({ profile }) => <Fact label="Profession">{profile.profession}</Fact>,
  },
  birthday: {
    has: (p) => !!p.birthday,
    render: ({ profile }) => {
      const age = ageOn(profile.birthday);
      return (
        <Fact label="Birthday" icon={Calendar}>
          {formatDate(profile.birthday, "long")}
          {age !== null && <span className="font-medium text-text-3"> · {age} years old</span>}
        </Fact>
      );
    },
  },
  tags: {
    has: (p) => p.tags.length > 0,
    wide: true,
    render: ({ profile }) => <Chips label="Tags" items={profile.tags} tag />,
  },
  favorite_movie: {
    has: (p) => hasText(p.favorite_movie),
    render: ({ profile }) => (
      <Fact label="Favorite movie" icon={Film}>
        {profile.favorite_movie}
      </Fact>
    ),
  },
  favorite_book: {
    has: (p) => hasText(p.favorite_book),
    render: ({ profile }) => (
      <Fact label="Favorite book" icon={Book}>
        {profile.favorite_book}
      </Fact>
    ),
  },
  music_preference: {
    has: (p) => hasText(p.music_preference),
    render: ({ profile }) => (
      <Fact label="Music preference" icon={Music}>
        {profile.music_preference}
      </Fact>
    ),
  },
  // The one tinted well on the sheet: the song someone is bound to.
  associated_song: {
    has: (p) => !!p.associated_song?.name,
    wide: true,
    render: ({ profile }) => (
      <div className="flex items-center gap-4 rounded-2xl border border-peach-line bg-peach-soft px-4 py-4">
        <Music className="h-5 w-5 shrink-0 text-peach-ink" aria-hidden="true" />
        <div className="min-w-0">
          <p className="t-label mb-0.5 text-peach-ink">Their song</p>
          <p className="break-words text-sm font-semibold text-text-1">
            {profile.associated_song!.name}
          </p>
          {profile.associated_song!.artist && (
            <p className="break-words text-xs text-text-2">{profile.associated_song!.artist}</p>
          )}
        </div>
      </div>
    ),
  },
  top_songs: {
    has: (p) => p.top_songs.length > 0,
    wide: true,
    render: ({ profile }) => (
      <div>
        <Label icon={ListMusic}>Top songs</Label>
        <ol className="space-y-3">
          {profile.top_songs.map((song, i) => (
            <li key={`${song.name}-${i}`} className="flex items-center gap-3.5">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-sm font-extrabold",
                  RANK_TINTS[i % RANK_TINTS.length]
                )}
                aria-label={`Number ${i + 1}`}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-text-1">{song.name}</p>
                {song.artist && <p className="break-words text-xs text-text-2">{song.artist}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  movie_genres: {
    has: (p) => p.movie_genres.length > 0,
    render: ({ profile }) => (
      <Chips label="Movie genres" icon={Film} items={profile.movie_genres} />
    ),
  },
  book_genres: {
    has: (p) => p.book_genres.length > 0,
    render: ({ profile }) => <Chips label="Book genres" icon={Book} items={profile.book_genres} />,
  },
  hangout_places: {
    has: (p) => p.hangout_places.length > 0,
    render: ({ profile }) => (
      <Chips label="Hangout places" icon={MapPin} items={profile.hangout_places} />
    ),
  },
  food_restrictions: {
    has: (p) => p.food_restrictions.length > 0,
    render: ({ profile }) => (
      <Chips label="Food restrictions" icon={Utensils} items={profile.food_restrictions} />
    ),
  },
  political_views: {
    has: (p) => p.political_views.length > 0,
    render: ({ profile }) => (
      <Chips label="Political views" icon={Vote} items={profile.political_views} />
    ),
  },
  long_term_goals: {
    has: (p) => hasText(p.long_term_goals),
    wide: true,
    render: ({ profile }) => <Prose label="Long-term goals" text={profile.long_term_goals} />,
  },
  favorite_memories: {
    has: (p) => p.favorite_memories.length > 0,
    wide: true,
    render: ({ profile, openMemory }) => (
      <div>
        <Label icon={Heart}>Favorite memories</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {profile.favorite_memories.map((memory) => (
            <MemoryCard key={memory} memory={memory} onOpen={() => openMemory(memory)} />
          ))}
        </div>
      </div>
    ),
  },
  notes: {
    has: (p) => hasText(p.notes),
    wide: true,
    render: ({ profile }) => <Prose label="Additional notes" text={profile.notes} />,
  },
  quotes: {
    has: (p) => p.quotes.length > 0,
    wide: true,
    render: ({ profile, openQuote }) => (
      <div>
        <Label icon={Quote}>{FIELD_LABELS.quotes}</Label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {profile.quotes.map((quote) => (
            <QuoteBubble key={quote} quote={quote} onOpen={() => openQuote(quote)} />
          ))}
        </div>
      </div>
    ),
  },
};

/**
 * A profile as one sheet of paper, top to bottom — the same page the PDF
 * prints and the form edits. Tape and rules divide it, not separate cards.
 */
export default function ProfileSheet({ profile }: { profile: ProfileOutput }) {
  const [quote, setQuote] = useState<string | null>(null);
  const [memory, setMemory] = useState<string | null>(null);
  const tape = tapeFor(profile.id);
  const context: RenderContext = { profile, openQuote: setQuote, openMemory: setMemory };

  const sections = PROFILE_SECTIONS.map((section) => ({
    section,
    fields: section.fields.filter((key) => RENDERERS[key].has(profile)),
  })).filter(({ fields }) => fields.length > 0);

  return (
    <>
      <motion.article
        {...enter(0, 12)}
        className="paper relative rounded-[28px] px-5 py-7 sm:px-9 sm:py-9"
      >
        {/* The one pinned strip on the page: the same tape as this person's
            card in the grid, so the card you tapped is the sheet you land on. */}
        <Tape color={tape.color} width={tape.width + 20} tilt={tape.angle} />

        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <Avatar id={profile.id} name={profile.full_name} size="lg" />
          <div className="w-full min-w-0 flex-1">
            <h1 className="t-page-title mb-1 text-text-1 [overflow-wrap:anywhere]">
              {profile.full_name}
            </h1>
            {profile.pronouns && (
              <p className="mb-2.5 text-sm font-semibold lowercase text-text-3">
                {profile.pronouns}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-text-3">
              <span className="sticker-chip inline-flex items-center gap-1.5 px-2.5 py-1 text-text-2">
                <Heart className="h-3 w-3" aria-hidden="true" />
                {profile.relationship_type}
              </span>
              {profile.birthday && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {formatDate(profile.birthday, "birthday")}
                </span>
              )}
              {profile.zodiac_sign && (
                <span className="inline-flex items-center gap-1.5">
                  <ZodiacIcon sign={profile.zodiac_sign} size={12} className="text-blue-ink" />
                  {profile.zodiac_sign}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Your own words about them, set as lead prose. */}
        {profile.bio && (
          <p className="t-body mt-6 whitespace-pre-line text-text-2">{profile.bio}</p>
        )}

        <hr className="mt-6 border-0 border-t border-line" />

        {sections.length === 0 ? (
          <p className="pt-8 text-sm text-text-3">
            Nothing else written down yet. Edit the profile to add what you know about them.
          </p>
        ) : (
          sections.map(({ section, fields }, index) => (
            <SheetSection key={section.id} section={section} index={index}>
              <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                {fields.map((key) => (
                  <div key={key} className={cn(RENDERERS[key].wide && "sm:col-span-2")}>
                    {RENDERERS[key].render(context)}
                  </div>
                ))}
              </div>
            </SheetSection>
          ))
        )}
      </motion.article>

      <QuoteModal text={quote} person={profile.full_name} onClose={() => setQuote(null)} />
      <QuoteModal
        text={memory}
        person={profile.full_name}
        variant="memory"
        onClose={() => setMemory(null)}
      />
    </>
  );
}
