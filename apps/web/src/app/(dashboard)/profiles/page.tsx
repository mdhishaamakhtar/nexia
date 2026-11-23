"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { RELATIONSHIP_TYPES, type RelationshipType } from "@nexia/shared";
import Button from "@/components/atoms/Button";
import SearchField from "@/components/atoms/SearchField";
import PageShell from "@/components/layout/PageShell";
import CardProfilePreview from "@/components/molecules/CardProfilePreview";
import StatusNote from "@/components/molecules/StatusNote";
import { useProfileList } from "@/features/profiles/hooks";
import { cn } from "@/lib/utils";
import { enter } from "@/shared/ui/motion";

const RELATIONSHIP_OPTIONS = [
  { value: "" as const, label: "Everyone" },
  ...RELATIONSHIP_TYPES.map((type) => ({ value: type, label: type })),
];

/** One column on a phone, where cards lie flat; up to four standing cards. */
const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4";

function isRelationship(value: string | null): value is RelationshipType {
  return !!value && (RELATIONSHIP_TYPES as readonly string[]).includes(value);
}

/**
 * Everyone in the slambook. Search and filter live in the URL, so opening someone and
 * coming back finds the list as it was, and a filtered view can be bookmarked.
 */
function Slambook() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const typeParam = params.get("type");
  const relationship: RelationshipType | "" = isRelationship(typeParam) ? typeParam : "";

  const [search, setSearch] = useState(query);

  const setParams = useCallback(
    (next: { q?: string; type?: string }) => {
      const merged = new URLSearchParams(params);
      for (const [key, value] of Object.entries(next)) {
        if (value) merged.set(key, value);
        else merged.delete(key);
      }
      const qs = merged.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router]
  );

  // Debounce typing into the URL; the URL is what the query reads.
  useEffect(() => {
    if (search.trim() === query) return;
    const timer = setTimeout(() => setParams({ q: search.trim() }), 250);
    return () => clearTimeout(timer);
  }, [search, query, setParams]);

  const list = useProfileList(query, relationship);
  const profiles = list.data?.pages.flatMap((page) => page.data) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;
  const isFiltered = Boolean(query || relationship);

  return (
    <>
      <motion.header
        {...enter(0, 12)}
        className="mb-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 sm:mb-9"
      >
        <h1 className="t-page-title flex items-center gap-3 text-text-1">
          Your people
          {list.isSuccess && !isFiltered && total > 0 && (
            <span className="inline-flex h-9 items-center rounded-full bg-butter-soft px-3.5 text-lg font-bold tracking-normal text-butter-ink">
              <span className="sr-only">, </span>
              {total}
              <span className="sr-only"> in your slambook</span>
            </span>
          )}
        </h1>
        <Button href="/profiles/new">
          <Plus className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.4} aria-hidden="true" />
          Add someone
        </Button>
      </motion.header>

      <motion.div
        {...enter(0.06)}
        className="mb-7 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5"
      >
        <SearchField
          value={search}
          onChange={setSearch}
          label="Search profiles by name"
          placeholder="Find someone"
          className="lg:w-80 lg:shrink-0"
        />
        {/* One tap per relationship. On a phone the row scrolls sideways
            rather than wrapping into a wall of pills. */}
        <div
          role="group"
          aria-label="Show relationship"
          className="-mx-(--gutter) flex gap-1.5 overflow-x-auto px-(--gutter) [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
        >
          {RELATIONSHIP_OPTIONS.map((option) => {
            const on = option.value === relationship;
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={on}
                onClick={() => setParams({ type: option.value })}
                className={cn(
                  "h-11 shrink-0 cursor-pointer rounded-full px-4 text-[0.9375rem] font-semibold transition-colors",
                  on ? "bg-text-1 text-white" : "bg-surface-2 text-text-1 hover:bg-surface-3"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {list.isPending ? (
        <div className={GRID} role="status" aria-label="Loading your slambook">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shimmer h-[5.5rem] rounded-[1.75rem] sm:h-[14.75rem]" />
          ))}
        </div>
      ) : list.isError ? (
        <StatusNote
          title="Your slambook didn't load"
          actions={<Button onClick={() => void list.refetch()}>Try again</Button>}
        >
          Check your connection and try again. Nothing has been lost.
        </StatusNote>
      ) : profiles.length === 0 ? (
        isFiltered ? (
          <StatusNote
            title="No one matches that"
            actions={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setParams({ q: "", type: "" });
                }}
              >
                Clear search
              </Button>
            }
          >
            Try a different name, or show everyone.
          </StatusNote>
        ) : (
          <StatusNote
            title="Your slambook is empty"
            actions={
              <Button href="/profiles/new">
                <Plus className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.4} aria-hidden="true" />
                Add your first person
              </Button>
            }
          >
            Start with someone you&apos;d hate to forget the details about.
          </StatusNote>
        )
      ) : (
        <>
          {isFiltered && (
            <p className="mb-4 text-[0.9375rem] font-semibold text-text-3" aria-live="polite">
              {total} {total === 1 ? "match" : "matches"}
            </p>
          )}
          <ul className={cn(GRID, "transition-opacity", list.isPlaceholderData && "opacity-60")}>
            {profiles.map((profile, index) => (
              <CardProfilePreview key={profile.id} profile={profile} index={index} />
            ))}
          </ul>
          {list.hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => void list.fetchNextPage()}
                isLoading={list.isFetchingNextPage}
              >
                Show more
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function ProfilesPage() {
  return (
    <div className="page-body">
      <PageShell width="wide" as="main" id="main" className="pb-24 pt-8 sm:pt-12">
        <Suspense>
          <Slambook />
        </Suspense>
      </PageShell>
    </div>
  );
}
