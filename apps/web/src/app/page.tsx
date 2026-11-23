import type { Metadata } from "next";
import Link from "next/link";
import { PERSON_COLORS } from "@nexia/shared/brand";
import { ArrowRight } from "lucide-react";
import Button from "@/components/atoms/Button";
import Logo from "@/components/atoms/Logo";
import SignedInRedirect from "@/components/atoms/SignedInRedirect";
import PageShell from "@/components/layout/PageShell";
import Avatar, { Shape } from "@/features/profiles/components/Avatar";
import { identityFor } from "@/features/profiles/identity";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Nexia — Your Digital Slambook",
  description:
    "Capture the people who matter most. Store rich profiles for your friends, family, and connections — then ask anything about them.",
};

/** What the product does: three things, said plainly, each with its own shape. */
const FEATURES = [
  {
    title: "Rich profiles",
    body: "Birthdays, zodiac signs, top songs, favourite films, food quirks, quotes, memories: every detail that makes them them.",
    id: 3,
  },
  {
    title: "Ask Nexia",
    body: "Ask who loves jazz, who has a nut allergy, or whose birthday is next. It answers from your slambook and nothing else.",
    id: 22,
  },
  {
    title: "Always find them",
    body: "Search by name, filter by how you know them. Your whole circle, organised and easy to look up.",
    id: 30,
  },
] as const;

// Fictional people, drawn exactly like a real card so the page shows the
// product rather than describing it. Each id picks a colour and a shape the
// way a real profile's would (see identity.ts).
const SAMPLES = [
  { id: 1, name: "Alex Chen", who: "Friend · he/him", chips: ["Gemini", "coffee-lover"] },
  { id: 10, name: "Sana Mirza", who: "Friend · she/her", chips: ["Pisces", "artist"] },
  { id: 23, name: "Ammi", who: "Family", chips: ["Cancer", "gardener"] },
  { id: 32, name: "Rohan Verma", who: "Classmate · he/him", chips: ["Leo", "foodie"] },
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

function SampleCard({ sample }: { sample: (typeof SAMPLES)[number] }) {
  return (
    <li
      className={cn(
        identityFor(sample.id).className,
        "card-person flex min-h-[12.5rem] flex-col rounded-[1.75rem] p-5 sm:min-h-[14rem]"
      )}
    >
      <Avatar id={sample.id} name={sample.name} className="h-14 w-14 sm:h-16 sm:w-16" />
      <div className="mt-auto pt-5">
        <p className="text-xl font-bold leading-[1.1] tracking-[-0.02em] sm:text-[1.375rem]">
          {sample.name}
        </p>
        <p className="mt-1 text-sm font-medium sm:text-[0.9375rem]">{sample.who}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sample.chips.map((chip) => (
            <span key={chip} className="chip chip-on-color h-[1.875rem] px-3 text-[0.8125rem]">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </li>
  );
}

export default function LandingPage() {
  return (
    <>
      <SignedInRedirect />
      <nav aria-label="Main" className="h-(--navbar-h)">
        <PageShell width="wide" className="flex h-full items-center justify-between">
          <Link
            href="/"
            className="group/logo -ml-2 inline-flex h-11 items-center rounded-full px-2"
          >
            <Logo />
          </Link>
          <Button href="/login" variant="secondary" size="sm" className="px-5">
            Sign in
          </Button>
        </PageShell>
      </nav>

      <main id="main">
        <PageShell
          width="wide"
          as="section"
          className="grid items-center gap-x-12 gap-y-12 pb-20 pt-10 sm:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pb-28 lg:pt-20"
        >
          <div>
            <h1 className="t-display text-balance text-text-1">
              Capture the people who matter most.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-text-2 sm:text-xl">
              Keep the small things you&apos;d hate to forget: their songs, their quirks, the
              stories. Then just ask when you need them.
            </p>
            <Button href="/login#signup" size="lg" className="mt-9">
              Start your slambook
              <ArrowRight className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
            </Button>
          </div>

          {/* Two columns of cards, the second set a step lower, so the group
              reads as people gathered rather than a table. */}
          <div>
            <h2 className="sr-only">What a profile looks like</h2>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 [&>li:nth-child(even)]:translate-y-6 sm:[&>li:nth-child(even)]:translate-y-10">
              {SAMPLES.map((sample) => (
                <SampleCard key={sample.name} sample={sample} />
              ))}
            </ul>
          </div>
        </PageShell>

        <PageShell
          width="wide"
          as="section"
          className="grid gap-x-12 gap-y-8 pb-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:pb-28"
        >
          <h2 className="t-page-title text-text-1">What it&apos;s for</h2>
          <ul className="flex flex-col gap-9">
            {FEATURES.map(({ title, body, id }) => (
              <li key={title} className="flex gap-5">
                <Shape id={id} className="mt-0.5 h-11 w-11" />
                <div>
                  <h3 className="t-section-title text-text-1">{title}</h3>
                  <p className="t-body mt-1.5 max-w-xl text-pretty text-text-2">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </PageShell>

        <PageShell width="wide" as="section" className="pb-20 lg:pb-28">
          <h2 className="t-page-title max-w-3xl text-balance text-text-1">
            Everything that makes them them.
          </h2>
          <ul className="mt-8 flex flex-wrap gap-2 sm:gap-2.5">
            {STORABLE.map((item, i) => (
              <li
                key={item}
                className={cn(
                  `person-${PERSON_COLORS[i % PERSON_COLORS.length]}`,
                  "card-person rounded-full px-4 py-2.5 text-base font-semibold sm:px-5 sm:py-3 sm:text-lg"
                )}
              >
                {item}
              </li>
            ))}
          </ul>
        </PageShell>

        <PageShell width="wide" as="section" className="pb-20">
          <div className="person-butter card-person flex flex-wrap items-end justify-between gap-x-12 gap-y-8 rounded-[2rem] px-6 py-10 sm:rounded-[2.5rem] sm:p-14">
            <div className="max-w-2xl">
              <h2 className="t-display text-balance">Start your slambook today.</h2>
              <p className="mt-5 text-lg font-medium sm:text-xl">
                Free to use. No credit card. Your people, beautifully kept.
              </p>
            </div>
            <Button href="/login#signup" size="lg">
              Create your account
            </Button>
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-text-3">
            Your profiles are yours. When you ask Nexia a question, the profiles it reads to answer
            are sent to the AI services that power it.
          </p>
        </PageShell>
      </main>

      <footer>
        <PageShell
          width="wide"
          className="flex h-20 items-center justify-between gap-4 text-[0.9375rem]"
        >
          <Logo size="sm" />
          <span className="text-text-3">
            Made by{" "}
            <a
              href="https://hishaam.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-text-1 underline underline-offset-[3px] hover:decoration-2"
            >
              Hishaam Akhtar
            </a>
          </span>
        </PageShell>
      </footer>
    </>
  );
}
