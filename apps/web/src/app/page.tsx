import { Music } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import Button from "@/components/atoms/Button";
import Logo from "@/components/atoms/Logo";
import SignedInRedirect from "@/components/atoms/SignedInRedirect";
import Tape, { type TapeColor } from "@/components/atoms/Tape";
import PageShell from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Nexia — Your Digital Slambook",
  description:
    "Capture the people who matter most. Store rich profiles for your friends, family, and connections — then ask anything about them.",
};

/** What the product does, as one sheet with three columns rather than three feature cards. */
const FEATURES: Array<{ title: string; body: string; tape: TapeColor }> = [
  {
    title: "Rich profiles",
    body: "Birthdays, zodiac signs, top songs, favourite films, food quirks, quotes, memories: every detail that makes them them.",
    tape: "lavender",
  },
  {
    title: "Ask Nexia",
    body: "Ask who loves jazz, who has a nut allergy, or whose birthday is next. It answers from your slambook and nothing else.",
    tape: "peach",
  },
  {
    title: "Always find them",
    body: "Search by name, filter by how you know them. Your whole circle, organised and easy to look up.",
    tape: "blue",
  },
];

// Fictional people, shaped exactly like a real card so the page shows the
// product rather than describing it.
const SAMPLES = [
  {
    initial: "A",
    name: "Alex Chen",
    meta: "Gemini · Friend",
    tags: ["coffee-lover", "bookworm"],
    song: { name: "Yellow", artist: "Coldplay" },
    tape: "peach" as const,
    tilt: "-0.8deg",
    avatarTilt: -3,
  },
  {
    initial: "S",
    name: "Sana Mirza",
    meta: "Pisces · Best friend",
    tags: ["artist", "overthinker", "cat-person"],
    song: { name: "Liability", artist: "Lorde" },
    tape: "lavender" as const,
    tilt: "0.4deg",
    avatarTilt: 2,
  },
  {
    initial: "R",
    name: "Rohan Verma",
    meta: "Leo · Classmate",
    tags: ["gym-rat", "foodie"],
    song: { name: "HUMBLE.", artist: "Kendrick Lamar" },
    tape: "blue" as const,
    tilt: "-0.5deg",
    avatarTilt: -2,
  },
];

const STORABLE = [
  "Birthday & zodiac",
  "Top songs",
  "Favourite films",
  "Favourite books",
  "Personality tags",
  "Quotes",
  "Food restrictions",
  "Hangout places",
  "Long-term goals",
  "Favourite memories",
  "Their song",
  "Political views",
  "Music taste",
  "How you know them",
];

export default function LandingPage() {
  return (
    <>
      <SignedInRedirect />
      <nav
        aria-label="Main"
        className="sticky top-0 z-40 h-(--navbar-h) border-b border-line bg-surface"
      >
        <PageShell width="wide" className="flex h-full items-center justify-between">
          <Link href="/" className="group/logo -ml-2 inline-flex h-11 items-center rounded-xl px-2">
            <Logo />
          </Link>
          <Button href="/login" size="sm">
            Sign in
          </Button>
        </PageShell>
      </nav>

      <main id="main">
        <PageShell width="wide" as="section" className="pb-14 pt-16 text-center sm:pt-24">
          <h1 className="t-display mx-auto max-w-3xl text-balance text-text-1">
            Capture the people
            <br />
            <span className="text-text-3">who matter most.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-text-2 sm:text-lg">
            Keep the small things you&apos;d hate to forget: their songs, their quirks, the stories.
            Then just ask when you need them.
          </p>
          <Button href="/login#signup" size="lg" className="mt-9">
            Start your slambook
          </Button>
        </PageShell>

        {/* Sample cards. One on a phone — three tilted cards stacked vertically
            read as a mistake rather than a scrapbook. */}
        <PageShell width="wide" as="section" className="pb-20">
          <h2 className="sr-only">What a profile looks like</h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {SAMPLES.map((sample, i) => (
              <li
                key={sample.name}
                className={`paper relative rounded-2xl p-6 text-left ${i > 0 ? "hidden md:block" : ""}`}
                style={{ transform: `rotate(${sample.tilt})` }}
              >
                <Tape color={sample.tape} width={80} />
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lavender text-lg font-extrabold text-lavender-ink"
                    style={{ transform: `rotate(${sample.avatarTilt}deg)` }}
                    aria-hidden="true"
                  >
                    {sample.initial}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-1">{sample.name}</p>
                    <p className="text-xs text-text-3">{sample.meta}</p>
                  </div>
                </div>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {sample.tags.map((tag) => (
                    <span key={tag} className="sticker-tag px-2.5 py-1 text-xs font-semibold">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-peach-line bg-peach-soft p-3">
                  <Music className="h-4 w-4 shrink-0 text-peach-ink" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-1">{sample.song.name}</p>
                    <p className="text-xs text-text-2">{sample.song.artist}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </PageShell>

        <PageShell width="wide" as="section" className="pb-20">
          <div className="paper relative rounded-3xl px-7 py-9 sm:px-10">
            <Tape color="lavender" width={92} height={22} />
            <h2 className="t-section-title mb-8 text-center text-text-1">What it&apos;s for</h2>
            <ul className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
              {FEATURES.map(({ title, body, tape }) => (
                <li key={title} className="md:px-8 md:first:pl-0 md:last:pr-0">
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="tape-mark"
                      style={{ background: `var(--${tape})` }}
                      aria-hidden="true"
                    />
                    <h3 className="text-base font-bold text-text-1">{title}</h3>
                  </div>
                  <p className="t-body text-text-2">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </PageShell>

        <PageShell width="wide" as="section" className="pb-20">
          <div className="paper rounded-3xl p-7 sm:p-10">
            <h2 className="t-section-title mb-5 text-text-1">
              Everything that makes them <span className="italic text-text-3">them.</span>
            </h2>
            <ul className="flex flex-wrap gap-2">
              {STORABLE.map((item) => (
                <li key={item} className="sticker-chip px-3 py-1.5 text-xs font-semibold">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </PageShell>

        <PageShell width="wide" as="section" className="pb-24">
          <div className="paper relative rounded-3xl p-10 text-center sm:p-12">
            <Tape color="peach" width={128} height={26} />
            <h2 className="t-page-title text-balance text-text-1">Start your slambook today.</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm text-text-2">
              Free to use. No credit card. Your people, beautifully kept.
            </p>
            <Button href="/login#signup" size="lg" className="mt-8">
              Create your account
            </Button>
            <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed text-text-3">
              Your profiles are yours. When you ask Nexia a question, the profiles it reads to
              answer are sent to the AI services that power it.
            </p>
          </div>
        </PageShell>
      </main>

      <footer className="border-t border-line">
        <PageShell width="wide" className="flex h-16 items-center justify-between text-xs">
          <Logo size="sm" />
          <span className="text-text-3">
            Made by{" "}
            <a
              href="https://hishaam.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-text-2 hover:underline"
            >
              Hishaam Akhtar
            </a>
          </span>
        </PageShell>
      </footer>
    </>
  );
}
