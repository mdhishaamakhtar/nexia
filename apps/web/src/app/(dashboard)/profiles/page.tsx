"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { RELATIONSHIP_TYPES, type RelationshipType } from "@nexia/shared";
import Button from "@/components/atoms/Button";
import SearchField from "@/components/atoms/SearchField";
import Select from "@/components/atoms/Select";
import PageShell from "@/components/layout/PageShell";
import CardProfilePreview from "@/components/molecules/CardProfilePreview";
import StatusNote from "@/components/molecules/StatusNote";
import { useProfileList } from "@/features/profiles/hooks";
import { enter } from "@/shared/ui/motion";

const RELATIONSHIP_OPTIONS = [
  { value: "" as const, label: "Everyone" },
  ...RELATIONSHIP_TYPES.map((type) => ({ value: type, label: type })),
];

function isRelationship(value: string | null): value is RelationshipType {
  return !!value && (RELATIONSHIP_TYPES as readonly string[]).includes(value);
}

/**
 * The slambook grid. Search and filter live in the URL, so opening someone and
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
      <motion.header {...enter(0, 12)} className="mb-10 text-center">
        <h1 className="t-page-title text-text-1">Your Slambook</h1>
        <p className="mt-2 text-sm text-text-3">
          {list.isSuccess && !isFiltered && total > 0
            ? `${total} ${total === 1 ? "person" : "people"} you carry in your heart`
            : "The people you carry in your heart"}
        </p>
      </motion.header>

      <motion.div
        {...enter(0.06)}
        className="mx-auto mb-10 flex max-w-xl flex-col gap-2.5 sm:flex-row"
      >
        <SearchField
          value={search}
          onChange={setSearch}
          label="Search profiles by name"
          placeholder="Search by name…"
          className="flex-1"
        />
        <Select
          className="shrink-0 sm:w-44"
          aria-label="Show relationship"
          value={relationship}
          onChange={(type) => setParams({ type })}
          options={RELATIONSHIP_OPTIONS}
        />
      </motion.div>

      {list.isPending ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role="status"
          aria-label="Loading your slambook"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-[150px] rounded-2xl" />
          ))}
        </div>
      ) : list.isError ? (
        <StatusNote
          eyebrow="Couldn't load"
          title="Your slambook didn't load"
          tape="peach"
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
                <Plus className="h-4 w-4" aria-hidden="true" />
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
            <p className="mb-4 text-sm font-semibold text-text-3" aria-live="polite">
              {total} {total === 1 ? "match" : "matches"}
            </p>
          )}
          <ul
            className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${list.isPlaceholderData ? "opacity-60" : ""}`}
          >
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
      {/* Bottom padding keeps the last row of cards clear of the add button. */}
      <PageShell width="wide" as="main" id="main" className="pb-28 pt-10 sm:pt-14">
        <Suspense>
          <Slambook />
        </Suspense>
      </PageShell>

      {/* Peach, not blue: white-on-blue measured 1.8:1 and this is the page's
          primary action. Offset clears the iOS home indicator. */}
      <Button
        href="/profiles/new"
        size="icon"
        aria-label="Add a new person"
        className="fixed right-5 z-40 h-14 w-14 rounded-full sm:right-8"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </Button>
    </div>
  );
}
