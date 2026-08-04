"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { RELATIONSHIP_TYPES } from "@nexia/shared";
import CardProfilePreview from "@/components/molecules/CardProfilePreview";
import PageShell from "@/components/layout/PageShell";
import Select from "@/components/atoms/Select";
import { listProfiles } from "@/features/profiles/api";
import type { ProfileSummary } from "@/shared/types/profile";

const RELATIONSHIP_OPTIONS = [
  { value: "", label: "All types" },
  ...RELATIONSHIP_TYPES.map((type) => ({ value: type, label: type })),
];

export default function ProfilesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["profiles", debouncedSearch, relationshipFilter],
    queryFn: () =>
      listProfiles({
        page: 1,
        limit: 100,
        search: debouncedSearch,
        relationship_type: relationshipFilter,
      }),
  });

  const profiles: ProfileSummary[] = data?.data ?? [];
  const isFiltered = Boolean(debouncedSearch || relationshipFilter);

  return (
    <div className="page-body">
      <PageShell width="wide" as="main" className="py-10 sm:py-14">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 text-center"
        >
          <h1 className="t-page-title" style={{ color: "var(--text-1)" }}>
            Your Slambook
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-3)" }}>
            people you carry in your heart
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
          className="mx-auto mb-10 flex max-w-xl flex-col gap-2.5 sm:flex-row"
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--text-3)" }}
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              aria-label="Search profiles by name"
              className="field w-full py-3 pl-10 pr-4"
            />
          </div>

          {/* The Select atom, not a bare <select>: the native chevron sits hard
              against the field's right edge with no padding of its own. Width
              goes on this wrapper, not the control — Select fills its parent,
              and the drawn chevron is positioned against that same box. */}
          <div className="shrink-0 sm:w-44">
            <Select
              value={relationshipFilter}
              onChange={(e) => setRelationshipFilter(e.target.value)}
              aria-label="Filter by relationship type"
              options={RELATIONSHIP_OPTIONS}
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shimmer h-[150px] rounded-2xl" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="paper mx-auto max-w-md rounded-3xl px-8 py-14 text-center"
          >
            <h2 className="t-section-title" style={{ color: "var(--text-1)" }}>
              {isFiltered ? "No one matches that" : "Your slambook is empty"}
            </h2>
            <p
              className="mx-auto mt-2 max-w-xs text-sm leading-relaxed"
              style={{ color: "var(--text-3)" }}
            >
              {isFiltered
                ? "Try a different name, or clear the filter."
                : "Start with someone you'd hate to forget the details about."}
            </p>
            {!isFiltered && (
              <Link
                href="/profiles/new"
                prefetch
                className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-[filter] hover:brightness-[0.97]"
                style={{
                  background: "var(--peach)",
                  color: "var(--peach-ink)",
                  borderColor: "var(--lavender-border)",
                }}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add your first person
              </Link>
            )}
          </motion.div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile, index) => (
              <CardProfilePreview
                key={profile.id}
                profile={profile}
                index={index}
                href={`/profiles/${profile.id}`}
              />
            ))}
          </ul>
        )}
      </PageShell>

      {/* Peach, not blue: white-on-blue measured 1.8:1 and this is the page's
          primary action. Offset clears the iOS home indicator. */}
      <Link
        href="/profiles/new"
        prefetch
        aria-label="Add new person"
        className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border transition-transform duration-200 hover:scale-105 active:scale-95 sm:right-8"
        style={{
          bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
          background: "var(--peach)",
          color: "var(--peach-ink)",
          borderColor: "var(--lavender-border)",
        }}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </Link>
    </div>
  );
}
