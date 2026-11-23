"use client";

import type { ProfileOutput } from "@nexia/shared";
import { useId, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Music } from "lucide-react";
import { cn } from "@/lib/utils";
import QuoteModal from "@/components/molecules/QuoteModal";
import { useIsClamped } from "@/shared/hooks/use-is-clamped";
import { ageOn, formatDate } from "@/shared/lib/dates";
import { enter } from "@/shared/ui/motion";
import { identityFor } from "../identity";
import type { ProfileFieldKey } from "../sections";
import Avatar from "./Avatar";
import ZodiacIcon from "./ZodiacIcon";

function hasText(value?: string | null): value is string {
  return Boolean(value?.trim());
}

/**
 * Where each profile field is shown: in the coloured header, or in the panel
 * with this title. It is typed against every field key, so a field added to
 * `sections.ts` and the form is a compile error here until the page shows it.
 */
const SHOWN_IN = {
  profession: "header",
  birthday: "header",
  tags: "header",
  quotes: "In their words",
  associated_song: "Their song",
  top_songs: "On repeat",
  favorite_movie: "Favorites",
  favorite_book: "Favorites",
  music_preference: "Favorites",
  movie_genres: "Favorites",
  book_genres: "Favorites",
  hangout_places: "Day to day",
  food_restrictions: "Day to day",
  political_views: "Day to day",
  favorite_memories: "Memories together",
  long_term_goals: "Dreams of",
  notes: "Notes",
} as const satisfies Record<ProfileFieldKey, string>;

/**
 * How wide a panel wants to be from `md` up. Panels sit in a wrapping row and
 * grow to fill it, so a wide and a narrow one pair up, two halves pair up, and
 * a panel left alone on its row takes all of it: the page never has a hole
 * where a field someone didn't fill in would have been.
 */
const WIDTHS = {
  wide: "md:basis-[calc(56%-0.5rem)]",
  narrow: "md:basis-[calc(40%-0.5rem)]",
  half: "md:basis-[calc(48%-0.5rem)]",
} as const;

function Panel({
  title,
  icon,
  width,
  solid = false,
  index,
  children,
}: {
  title: string;
  icon?: ReactNode;
  width: keyof typeof WIDTHS;
  /** Filled with the person's colour itself rather than its tint. */
  solid?: boolean;
  index: number;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <motion.section
      aria-labelledby={headingId}
      {...enter(0.05 + index * 0.04)}
      className={cn(
        "min-w-0 grow basis-full rounded-[1.75rem] p-6 sm:p-7",
        WIDTHS[width],
        solid ? "bg-p text-p-ink" : "panel-person"
      )}
    >
      <h2
        id={headingId}
        className="mb-4 flex items-center gap-2 text-[0.9375rem] font-bold text-p-ink"
      >
        {icon}
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

/** Label on the left, what you know on the right; a line between rows. */
function Rows({ children }: { children: ReactNode }) {
  return <dl className="divide-y-[1.5px] divide-p-soft">{children}</dl>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)]">
      <dt className="text-[0.9375rem] text-text-2">{label}</dt>
      <dd className="break-words text-[1.0625rem] font-semibold leading-snug text-text-1">
        {children}
      </dd>
    </div>
  );
}

/** A list read as a line of text, not a row of pills. */
function Items({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-1.5">
      {items.map((item) => (
        <li key={item} className="break-words after:content-[','] last:after:hidden">
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Something the person said, as a speech bubble in their colour: their words,
 * not yours. Opens in full when pressed.
 */
function Quote({ quote, onOpen }: { quote: string; onOpen: () => void }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const clamped = useIsClamped(textRef, quote);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={clamped ? `Read the whole quote: ${quote.slice(0, 60)}` : undefined}
      className="group max-w-full cursor-pointer rounded-[1.375rem] rounded-bl-md bg-p-soft px-5 py-3.5 text-left text-lg font-semibold leading-[1.3] tracking-[-0.01em] text-p-ink transition-transform duration-150 ease-out active:scale-[0.985] sm:text-[1.3125rem]"
    >
      <span ref={textRef} className="line-clamp-4 break-words">
        {quote}
      </span>
      {clamped && (
        <span className="mt-1.5 inline-block text-[0.9375rem] font-semibold underline underline-offset-2">
          Read all
        </span>
      )}
    </button>
  );
}

/** A memory is yours, not theirs: plain prose. Opens in full when pressed. */
function Memory({ memory, onOpen }: { memory: string; onOpen: () => void }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const clamped = useIsClamped(textRef, memory);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full cursor-pointer py-3 text-left text-[1.0625rem] leading-relaxed text-text-1 first:pt-0 last:pb-0"
    >
      <span ref={textRef} className="line-clamp-3 break-words">
        {memory}
      </span>
      {clamped && (
        <span className="mt-1 inline-block text-[0.9375rem] font-semibold text-text-2 underline underline-offset-2 group-hover:text-text-1">
          Read all
        </span>
      )}
    </button>
  );
}

/**
 * Short facts on a line with a dot between neighbours. Every fact carries its
 * dot in front, and the row is pulled left by the dot's width under a clipped
 * edge, so whichever fact starts a line loses its dot. However the line wraps,
 * it never opens or closes on a stray separator.
 */
function FactRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("overflow-hidden text-base font-medium sm:text-lg", className)}>
      <span className="-ml-5 flex flex-wrap items-center">{children}</span>
    </p>
  );
}

function Fact({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center before:w-5 before:shrink-0 before:text-center before:content-['·']">
      <span className="min-w-0">{children}</span>
    </span>
  );
}

/**
 * A person's page. Their colour fills the top: shape, name, who they are to
 * you, the line that sums them up. Under it, what you know about them, one
 * rounded panel per kind of thing, in a tint of the same colour. A field
 * nobody filled in leaves no gap and no placeholder.
 *
 * `toolbar` is the row of controls the page puts at the top of the coloured
 * block (back, export, delete, edit).
 */
export default function ProfileSheet({
  profile,
  toolbar,
}: {
  profile: ProfileOutput;
  toolbar?: ReactNode;
}) {
  const [quote, setQuote] = useState<string | null>(null);
  const [memory, setMemory] = useState<string | null>(null);
  const identity = identityFor(profile.id);
  const age = ageOn(profile.birthday);
  const who = [profile.relationship_type, profile.pronouns, profile.profession].filter(hasText);
  const song = profile.associated_song?.name ? profile.associated_song : null;

  const favourites: Array<[string, ReactNode]> = [];
  if (hasText(profile.favorite_movie)) favourites.push(["Favorite movie", profile.favorite_movie]);
  if (hasText(profile.favorite_book)) favourites.push(["Favorite book", profile.favorite_book]);
  if (hasText(profile.music_preference)) favourites.push(["Listens to", profile.music_preference]);
  if (profile.movie_genres.length > 0)
    favourites.push(["Movie genres", <Items key="m" items={profile.movie_genres} />]);
  if (profile.book_genres.length > 0)
    favourites.push(["Book genres", <Items key="b" items={profile.book_genres} />]);

  const dayToDay: Array<[string, ReactNode]> = [];
  if (profile.hangout_places.length > 0)
    dayToDay.push(["Find them at", <Items key="h" items={profile.hangout_places} />]);
  if (profile.food_restrictions.length > 0)
    dayToDay.push(["Doesn't eat", <Items key="f" items={profile.food_restrictions} />]);
  if (profile.political_views.length > 0)
    dayToDay.push(["Politics", <Items key="p" items={profile.political_views} />]);

  // In reading order. Each entry is a panel only if it has something to show.
  const panels: Array<Omit<Parameters<typeof Panel>[0], "index">> = [];
  if (profile.quotes.length > 0)
    panels.push({
      title: SHOWN_IN.quotes,
      width: "wide",
      children: (
        <div className="flex flex-col items-start gap-2.5">
          {profile.quotes.map((q) => (
            <Quote key={q} quote={q} onOpen={() => setQuote(q)} />
          ))}
        </div>
      ),
    });
  if (song)
    panels.push({
      title: SHOWN_IN.associated_song,
      icon: <Music className="h-[1.0625rem] w-[1.0625rem]" strokeWidth={2.4} aria-hidden="true" />,
      width: "narrow",
      solid: true,
      children: (
        <div className="pt-6 sm:pt-10">
          <p className="break-words text-[2rem] font-bold leading-none tracking-[-0.03em] sm:text-[2.625rem]">
            {song.name}
          </p>
          {song.artist && <p className="mt-2 break-words text-lg font-medium">{song.artist}</p>}
        </div>
      ),
    });
  if (profile.top_songs.length > 0)
    panels.push({
      title: SHOWN_IN.top_songs,
      width: "narrow",
      children: (
        <ol className="divide-y-[1.5px] divide-p-soft">
          {profile.top_songs.map((s, i) => (
            <li
              key={`${s.name}-${i}`}
              className="flex items-center gap-3.5 py-2.5 first:pt-0 last:pb-0"
            >
              <span
                className="flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-full bg-p text-sm font-bold text-p-ink"
                aria-label={`Number ${i + 1}`}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="break-words text-[1.0625rem] font-semibold leading-snug text-text-1">
                  {s.name}
                </p>
                {s.artist && <p className="break-words text-[0.9375rem] text-text-2">{s.artist}</p>}
              </div>
            </li>
          ))}
        </ol>
      ),
    });
  if (favourites.length > 0)
    panels.push({
      title: SHOWN_IN.favorite_movie,
      width: "wide",
      children: (
        <Rows>
          {favourites.map(([label, value]) => (
            <Row key={label} label={label}>
              {value}
            </Row>
          ))}
        </Rows>
      ),
    });
  if (dayToDay.length > 0)
    panels.push({
      title: SHOWN_IN.hangout_places,
      width: "half",
      children: (
        <Rows>
          {dayToDay.map(([label, value]) => (
            <Row key={label} label={label}>
              {value}
            </Row>
          ))}
        </Rows>
      ),
    });
  if (profile.favorite_memories.length > 0)
    panels.push({
      title: SHOWN_IN.favorite_memories,
      width: "half",
      children: (
        <div className="divide-y-[1.5px] divide-p-soft">
          {profile.favorite_memories.map((m) => (
            <Memory key={m} memory={m} onOpen={() => setMemory(m)} />
          ))}
        </div>
      ),
    });
  if (hasText(profile.long_term_goals))
    panels.push({
      title: SHOWN_IN.long_term_goals,
      width: "wide",
      children: (
        <p className="whitespace-pre-line break-words text-xl font-semibold leading-[1.3] tracking-[-0.015em] text-text-1 sm:text-2xl">
          {profile.long_term_goals}
        </p>
      ),
    });
  if (hasText(profile.notes))
    panels.push({
      title: SHOWN_IN.notes,
      width: "narrow",
      children: (
        <p className="whitespace-pre-line break-words text-[1.0625rem] leading-relaxed text-text-1">
          {profile.notes}
        </p>
      ),
    });

  return (
    <>
      <article className={identity.className}>
        <motion.header
          {...enter(0, 12)}
          className="card-person rounded-[2rem] p-5 sm:rounded-[2.5rem] sm:p-10 lg:px-13 lg:pb-13"
        >
          {toolbar}

          <div
            className={cn("flex flex-wrap items-center gap-5 sm:gap-8", toolbar && "mt-8 sm:mt-12")}
          >
            <Avatar id={profile.id} name={profile.full_name} size="lg" />
            <div className="min-w-0">
              <h1 className="t-name [overflow-wrap:anywhere]">{profile.full_name}</h1>
              <FactRow className="mt-2.5">
                {who.map((part, i) => (
                  // By position: pronouns and profession can be the same text.
                  <Fact key={i}>{part}</Fact>
                ))}
              </FactRow>
              {profile.birthday && (
                <FactRow>
                  <Fact>Born {formatDate(profile.birthday, "long")}</Fact>
                  {age !== null && <Fact>{age} years old</Fact>}
                  {profile.zodiac_sign && (
                    <Fact>
                      <span className="inline-flex items-center gap-1.5">
                        <ZodiacIcon sign={profile.zodiac_sign} size={17} />
                        <span>{profile.zodiac_sign}</span>
                      </span>
                    </Fact>
                  )}
                </FactRow>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="mt-7 max-w-[41rem] whitespace-pre-line text-pretty text-lg font-medium leading-[1.45] sm:mt-9 sm:text-[1.375rem]">
              {profile.bio}
            </p>
          )}

          {profile.tags.length > 0 && (
            <ul aria-label="Tags" className="mt-6 flex flex-wrap gap-2">
              {profile.tags.map((tag) => (
                // A tag can be a whole sentence; on someone's own page it
                // wraps rather than being cut short.
                <li
                  key={tag}
                  className="chip chip-on-color min-h-9 max-w-full whitespace-normal rounded-[1.125rem] px-4 py-1.5 text-[0.9375rem] leading-snug"
                >
                  <span className="break-words">{tag}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.header>

        {panels.length === 0 ? (
          <p className="panel-person mt-4 rounded-[1.75rem] px-7 py-8 text-[1.0625rem] text-text-1">
            Nothing else written down yet. Edit the profile to add what you know about them.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-4">
            {panels.map((panel, index) => (
              <Panel key={panel.title} index={index} {...panel} />
            ))}
          </div>
        )}
      </article>

      <QuoteModal
        text={quote}
        person={profile.full_name}
        personClassName={identity.className}
        onClose={() => setQuote(null)}
      />
      <QuoteModal
        text={memory}
        person={profile.full_name}
        personClassName={identity.className}
        variant="memory"
        onClose={() => setMemory(null)}
      />
    </>
  );
}
