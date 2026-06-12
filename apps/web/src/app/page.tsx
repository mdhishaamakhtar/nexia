import Link from "next/link";
import { BookOpen, MessageCircle, Search, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { AuthRedirect } from "@/components/atoms/AuthRedirect";

export const metadata: Metadata = {
  title: "Nexia — Your Digital Slambook",
  description:
    "Capture the people who matter most. Store rich profiles for your friends, family, and connections — then ask AI anything about them.",
};

function FeatureCard({
  icon: Icon,
  title,
  description,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="glass-panel rounded-2xl p-6 relative group overflow-hidden">
      <div
        className="washi-tape-accent w-16 opacity-20 group-hover:opacity-60 transition-opacity duration-300"
        style={{ background: accent }}
      />
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: "var(--fill-hover)", color: "var(--text-2)" }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-1)" }}>
        {title}
      </h3>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>
        {description}
      </p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ color: "var(--text-1)" }}>
      <AuthRedirect />
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 glass-panel border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
          <span className="text-sm font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
            Nexia
          </span>
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: "var(--peach)", color: "var(--text-1)" }}
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest mb-8 px-4 py-2 rounded-full border"
          style={{
            color: "var(--text-3)",
            borderColor: "var(--border)",
            background: "var(--fill)",
          }}
        >
          <Sparkles className="w-3 h-3" />
          your personal slambook
        </div>

        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
          style={{ color: "var(--text-1)" }}
        >
          Capture the people
          <br />
          <span style={{ color: "var(--text-3)", fontWeight: 600 }}>who matter most.</span>
        </h1>

        <p
          className="text-base sm:text-lg max-w-lg mx-auto mb-10 leading-relaxed"
          style={{ color: "var(--text-2)" }}
        >
          Store rich profiles for your friends, family, and connections — their songs, quirks,
          memories, and everything in between. Then ask AI anything.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-bold px-8 py-3.5 rounded-2xl transition-opacity hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--peach)", color: "var(--text-1)" }}
        >
          Start your slambook
        </Link>
      </section>

      {/* Decorative profile cards */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 [&>*:not(:first-child)]:hidden md:[&>*:not(:first-child)]:block">
          {/* Card 1 */}
          <div
            className="glass-panel rounded-2xl p-6 text-left relative scrapbook-card"
            style={{ transform: "rotate(-0.8deg)" }}
          >
            <div
              className="washi-tape-accent w-20"
              style={{ opacity: 0.6, background: "var(--peach)" }}
            />
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                style={{ background: "var(--lavender)", color: "var(--text-1)" }}
              >
                A
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: "var(--text-1)" }}>
                  Alex Chen
                </div>
                <div className="text-xs" style={{ color: "var(--text-3)" }}>
                  ♊ Gemini · Friend
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {["#coffee-lover", "#bookworm"].map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full border"
                  style={{
                    background: "var(--fill)",
                    borderColor: "var(--border)",
                    color: "var(--text-3)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div
              className="flex items-center gap-2.5 rounded-xl p-3 border"
              style={{ background: "var(--fill)", borderColor: "var(--border)" }}
            >
              <span className="text-sm" style={{ color: "var(--text-3)" }}>
                ♪
              </span>
              <div>
                <div className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>
                  Yellow
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  Coldplay
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div
            className="glass-panel rounded-2xl p-6 text-left relative scrapbook-card"
            style={{ transform: "rotate(0.4deg)" }}
          >
            <div
              className="washi-tape-accent w-24"
              style={{ opacity: 0.7, background: "var(--lavender)" }}
            />
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                style={{ background: "var(--peach)", color: "var(--text-1)" }}
              >
                S
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: "var(--text-1)" }}>
                  Sana Mirza
                </div>
                <div className="text-xs" style={{ color: "var(--text-3)" }}>
                  ♓ Pisces · Best Friend
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {["#artist", "#overthinker", "#cat-person"].map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full border"
                  style={{
                    background: "var(--fill)",
                    borderColor: "var(--border)",
                    color: "var(--text-3)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div
              className="flex items-center gap-2.5 rounded-xl p-3 border"
              style={{ background: "var(--fill)", borderColor: "var(--border)" }}
            >
              <span className="text-sm" style={{ color: "var(--text-3)" }}>
                ♪
              </span>
              <div>
                <div className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>
                  Liability
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  Lorde
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div
            className="glass-panel rounded-2xl p-6 text-left relative scrapbook-card"
            style={{ transform: "rotate(-0.5deg)" }}
          >
            <div
              className="washi-tape-accent w-20"
              style={{ opacity: 0.6, background: "var(--blue)" }}
            />
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                style={{ background: "var(--fill-hover)", color: "var(--text-1)" }}
              >
                R
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: "var(--text-1)" }}>
                  Rohan Verma
                </div>
                <div className="text-xs" style={{ color: "var(--text-3)" }}>
                  ♌ Leo · Classmate
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {["#gym-rat", "#foodie"].map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full border"
                  style={{
                    background: "var(--fill)",
                    borderColor: "var(--border)",
                    color: "var(--text-3)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div
              className="flex items-center gap-2.5 rounded-xl p-3 border"
              style={{ background: "var(--fill)", borderColor: "var(--border)" }}
            >
              <span className="text-sm" style={{ color: "var(--text-3)" }}>
                ♪
              </span>
              <div>
                <div className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>
                  HUMBLE.
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  Kendrick Lamar
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div
          className="text-[11px] font-bold uppercase tracking-[0.14em] text-center mb-8"
          style={{ color: "var(--text-3)" }}
        >
          Everything you need
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={BookOpen}
            title="Rich profiles"
            description="Birthdays, zodiac signs, top songs, favorite movies, food quirks, quotes, memories — every detail that makes them them."
            accent="var(--lavender)"
          />
          <FeatureCard
            icon={MessageCircle}
            title="Ask Nexia AI"
            description="Powered by Gemini and your profiles. Ask anything — who loves jazz, who has a nut allergy, whose birthday is next week."
            accent="var(--peach)"
          />
          <FeatureCard
            icon={Search}
            title="Always find them"
            description="Search by name, filter by relationship type. Your whole network, organized and instantly searchable."
            accent="var(--blue)"
          />
        </div>
      </section>

      {/* What you can store */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="glass-panel rounded-3xl p-8 sm:p-10 relative overflow-hidden">
          <div
            className="washi-tape-accent w-32 h-8"
            style={{ opacity: 0.5, background: "var(--lavender)" }}
          />
          <div
            className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3"
            style={{ color: "var(--text-3)" }}
          >
            Capture every detail
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: "var(--text-1)" }}>
            Everything that makes them{" "}
            <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>them.</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              "Birthday & Zodiac",
              "Top Songs",
              "Favorite Movies",
              "Favorite Books",
              "Personality Tags",
              "Quotes",
              "Food Restrictions",
              "Hangout Places",
              "Long-term Goals",
              "Favorite Memory",
              "Associated Song",
              "Political Views",
              "Music Preference",
              "Relationship Type",
            ].map((item) => (
              <span
                key={item}
                className="text-xs px-3 py-1.5 rounded-full border font-medium"
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
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-24 text-center">
        <div className="glass-panel rounded-3xl p-12 relative overflow-hidden">
          <div
            className="washi-tape-accent w-40 h-8"
            style={{ opacity: 0.4, background: "var(--peach)" }}
          />
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight"
            style={{ color: "var(--text-1)" }}
          >
            Start your slambook today.
          </h2>
          <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: "var(--text-3)" }}>
            Free to use. No credit card required. Your people, beautifully captured.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-bold px-8 py-3.5 rounded-2xl transition-opacity hover:opacity-90"
            style={{ background: "var(--peach)", color: "var(--text-1)" }}
          >
            Create your account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: "var(--text-1)" }}>
            Nexia
          </span>
          <span className="text-xs" style={{ color: "var(--text-3)" }}>
            Made by{" "}
            <a
              href="https://hishaam.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "var(--text-2)" }}
            >
              Hishaam Akhtar
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
