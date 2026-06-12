"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import CardProfilePreview from "@/components/molecules/CardProfilePreview";
import { listProfiles } from "@/features/profiles/api";
import type { Profile } from "@/shared/types/profile";

const RELATIONSHIP_TYPES = [
  "Friend",
  "Family",
  "Colleague",
  "Classmate",
  "Crush",
  "Ex",
  "Mentor",
  "Other",
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
  const profiles: Profile[] = data?.data ?? [];

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
          className="mb-12 text-center"
        >
          <h1
            className="text-4xl sm:text-5xl font-semibold tracking-tight mb-3"
            style={{ color: "var(--text-1)" }}
          >
            Your Slambook
          </h1>
          <p
            className="text-sm max-w-xs mx-auto leading-relaxed"
            style={{ color: "var(--text-3)" }}
          >
            people you carry in your heart
          </p>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 16, rotate: 0.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 22, delay: 0.08 }}
          className="mb-10 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto"
        >
          <div className="flex-1 relative group">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
              style={{ color: "var(--text-3)" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search by name..."
              aria-label="Search by name"
              className="w-full glass-input pl-10 pr-4 py-3 rounded-xl text-sm"
            />
          </div>

          <select
            value={relationshipFilter}
            onChange={(e) => setRelationshipFilter(e.target.value)}
            aria-label="Filter by relationship type"
            className="glass-input px-4 py-3 rounded-xl text-sm min-w-[140px] appearance-none cursor-pointer"
          >
            <option value="">all types</option>
            {RELATIONSHIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[150px] rounded-2xl shimmer" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, rotate: -0.5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 22 }}
            className="text-center py-24 glass-panel rounded-3xl"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 border"
              style={{
                background: "var(--fill)",
                borderColor: "var(--border)",
              }}
            >
              <span className="text-xl" style={{ color: "var(--text-3)" }} aria-hidden="true">
                ✦
              </span>
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-2)" }}>
              {search ? "no one found" : "your slambook is empty"}
            </h3>
            <p
              className="text-xs mb-8 max-w-xs mx-auto leading-relaxed"
              style={{ color: "var(--text-3)" }}
            >
              {search
                ? "try a different name or filter"
                : "start adding the people who matter most"}
            </p>
            {!search && (
              <Link
                href="/profiles/new"
                prefetch
                className="text-sm font-medium text-white px-6 py-2.5 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] inline-block"
                style={{ background: "var(--blue)" }}
              >
                Add your first person
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {profiles.map((profile, index) => (
              <CardProfilePreview
                key={profile.id}
                profile={profile}
                index={index}
                href={`/profiles/${profile.id}`}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/profiles/new"
        prefetch
        aria-label="Add new person"
        className="fixed bottom-6 right-6 z-40"
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 22 }}
          whileHover={{
            scale: 1.1,
            rotate: 90,
            transition: { type: "spring", stiffness: 400, damping: 22 },
          }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 text-white rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: "var(--blue)" }}
        >
          <Plus className="w-6 h-6" />
        </motion.div>
      </Link>
    </div>
  );
}
