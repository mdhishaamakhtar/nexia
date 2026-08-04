import Link from "next/link";
import { BookOpen, MessageCircle, Music, Search } from "lucide-react";
import type { Metadata } from "next";
import { AuthRedirect } from "@/components/atoms/AuthRedirect";
import PageShell from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Nexia — Your Digital Slambook",
  description:
    "Capture the people who matter most. Store rich profiles for your friends, family, and connections — then ask AI anything about them.",
};

const FEATURES = [
  {
    icon: BookOpen,
    title: "Rich profiles",
    description:
      "Birthdays, zodiac signs, top songs, favourite films, food quirks, quotes, memories — every detail that makes them them.",
    tape: "var(--lavender)",
  },
  {
    icon: MessageCircle,
    title: "Ask Nexia",
    description:
      "It reads your slambook, so you can ask who loves jazz, who has a nut allergy, or whose birthday is next week.",
    tape: "var(--peach)",
  },
  {
    icon: Search,
    title: "Always find them",
    description:
      "Search by name, filter by how you know them. Your whole circle, organised and instantly searchable.",
    tape: "var(--blue)",
  },
] as const;

// Sample cards for the hero. Fictional people, shaped exactly like a real
// profile card so the page shows the product rather than describing it.
const SAMPLES = [
  {
    initial: "A",
    name: "Alex Chen",
    meta: "Gemini · Friend",
    tags: ["coffee-lover", "bookworm"],
    song: { name: "Yellow", artist: "Coldplay" },
    tint: { bg: "var(--lavender)", ink: "var(--lavender-ink)" },
    tape: "var(--peach)",
    tilt: "-0.8deg",
  },
  {
    initial: "S",
    name: "Sana Mirza",
    meta: "Pisces · Best friend",
    tags: ["artist", "overthinker", "cat-person"],
    song: { name: "Liability", artist: "Lorde" },
    tint: { bg: "var(--peach)", ink: "var(--peach-ink)" },
    tape: "var(--lavender)",
    tilt: "0.4deg",
  },
  {
    initial: "R",
    name: "Rohan Verma",
    meta: "Leo · Classmate",
    tags: ["gym-rat", "foodie"],
    song: { name: "HUMBLE.", artist: "Kendrick Lamar" },
    tint: { bg: "var(--blue)", ink: "var(--blue-ink)" },
    tape: "var(--blue)",
    tilt: "-0.5deg",
  },
] as const;

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
      <AuthRedirect />

      <nav
        className="sticky top-0 z-40 border-b"
        style={{
          height: "var(--navbar-h)",
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <PageShell width="wide" className="flex h-full items-center justify-between">
          <span
            className="text-base font-extrabold tracking-tight"
            style={{ color: "var(--text-1)" }}
          >
            Nexia
          </span>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold transition-[filter] hover:brightness-[0.97]"
            style={{
              background: "var(--peach)",
              color: "var(--peach-ink)",
              borderColor: "var(--lavender-border)",
            }}
          >
            Sign in
          </Link>
        </PageShell>
      </nav>

      <main>
        <PageShell width="wide" as="section" className="pb-14 pt-16 text-center sm:pt-24">
          <h1 className="t-display mx-auto max-w-3xl" style={{ color: "var(--text-1)" }}>
            Capture the people
            <br />
            <span style={{ color: "var(--text-3)" }}>who matter most.</span>
          </h1>

          <p
            className="mx-auto mt-6 max-w-lg text-base leading-relaxed sm:text-lg"
            style={{ color: "var(--text-2)" }}
          >
            Keep the small things you&apos;d hate to forget — their songs, their quirks, the
            stories. Then just ask when you need them.
          </p>

          <Link
            href="/login"
            className="mt-9 inline-flex min-h-12 items-center rounded-2xl border px-8 text-sm font-bold transition-[filter] hover:brightness-[0.97]"
            style={{
              background: "var(--peach)",
              color: "var(--peach-ink)",
              borderColor: "var(--lavender-border)",
            }}
          >
            Start your slambook
          </Link>
        </PageShell>

        {/* Sample cards. One column on mobile — three tilted cards stacked
            vertically would read as a mistake rather than a scrapbook. */}
        <PageShell width="wide" as="section" className="pb-20">
          <h2 className="sr-only">What a profile looks like</h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {SAMPLES.map((sample, i) => (
              <li
                key={sample.name}
                className={`paper relative rounded-2xl p-6 text-left ${i > 0 ? "hidden md:block" : ""}`}
                style={{ transform: `rotate(${sample.tilt})` }}
              >
                <span
                  className="washi-tape"
                  style={{ width: 80, background: sample.tape }}
                  aria-hidden="true"
                />

                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold"
                    style={{ background: sample.tint.bg, color: sample.tint.ink }}
                    aria-hidden="true"
                  >
                    {sample.initial}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
                      {sample.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>
                      {sample.meta}
                    </p>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-1.5">
                  {sample.tags.map((tag) => (
                    <span key={tag} className="sticker-tag px-2.5 py-1 text-xs font-semibold">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="paper-sunk flex items-center gap-3 rounded-xl p-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--surface-3)", color: "var(--text-2)" }}
                    aria-hidden="true"
                  >
                    <Music className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold" style={{ color: "var(--text-2)" }}>
                      {sample.song.name}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                      {sample.song.artist}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </PageShell>

        <PageShell width="wide" as="section" className="pb-20">
          <h2 className="t-section-title mb-7 text-center" style={{ color: "var(--text-1)" }}>
            Everything you need
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description, tape }) => (
              <li key={title} className="paper group relative rounded-2xl p-6">
                <span
                  className="washi-tape opacity-40 transition-opacity duration-200 group-hover:opacity-80"
                  style={{ width: 64, background: tape }}
                  aria-hidden="true"
                />
                <span
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mb-2 text-sm font-bold" style={{ color: "var(--text-1)" }}>
                  {title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>
                  {description}
                </p>
              </li>
            ))}
          </ul>
        </PageShell>

        <PageShell width="wide" as="section" className="pb-20">
          <div className="paper relative overflow-hidden rounded-3xl p-7 sm:p-10">
            <h2 className="t-section-title mb-5" style={{ color: "var(--text-1)" }}>
              Everything that makes them{" "}
              <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>them.</span>
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
            <span
              className="washi-tape"
              style={{ width: 128, height: 26, background: "var(--peach)" }}
              aria-hidden="true"
            />
            <h2 className="t-page-title" style={{ color: "var(--text-1)" }}>
              Start your slambook today.
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm" style={{ color: "var(--text-3)" }}>
              Free to use. No credit card. Your people, beautifully kept.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex min-h-12 items-center rounded-2xl border px-8 text-sm font-bold transition-[filter] hover:brightness-[0.97]"
              style={{
                background: "var(--peach)",
                color: "var(--peach-ink)",
                borderColor: "var(--lavender-border)",
              }}
            >
              Create your account
            </Link>
          </div>
        </PageShell>
      </main>

      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <PageShell width="wide" className="flex h-16 items-center justify-between text-xs">
          <span className="font-bold" style={{ color: "var(--text-1)" }}>
            Nexia
          </span>
          <span style={{ color: "var(--text-3)" }}>
            Made by{" "}
            <a
              href="https://hishaam.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
              style={{ color: "var(--text-2)" }}
            >
              Hishaam Akhtar
            </a>
          </span>
        </PageShell>
      </footer>
    </>
  );
}
