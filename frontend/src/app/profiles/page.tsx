"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import Navbar from "@/components/molecules/Navbar";
import CardProfilePreview from "@/components/molecules/CardProfilePreview";
import { listProfiles } from "@/features/profiles/api";
import type { Profile } from "@/shared/types/profile";

export default function ProfilesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["profiles", search, relationshipFilter],
    queryFn: () =>
      listProfiles({
        page: 1,
        limit: 100,
        search,
        relationship_type: relationshipFilter,
      }),
  });
  const profiles: Profile[] = data?.data ?? [];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--color-bg)] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-12 text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 pb-2">
              Your Universe
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
              A digital sanctuary for the people who matter most. Preserved in time, styled with
              grace.
            </p>
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-10 flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto"
          >
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)] group-focus-within:text-[var(--color-primary-from)] transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full glass-input pl-12 pr-4 py-4 rounded-2xl border border-[var(--color-border-subtle)] focus:border-[var(--color-primary-from)] focus:ring-2 focus:ring-[var(--color-primary-from)]/20 transition-all duration-300 bg-[var(--color-surface)]"
              />
            </div>

            <select
              value={relationshipFilter}
              onChange={(e) => setRelationshipFilter(e.target.value)}
              className="glass-input px-6 py-4 rounded-2xl border border-[var(--color-border-subtle)] focus:border-[var(--color-primary-from)] focus:ring-2 focus:ring-[var(--color-primary-from)]/20 transition-all duration-300 bg-[var(--color-surface)] min-w-[200px] appearance-none cursor-pointer"
            >
              <option value="">All Relationships</option>
              <option value="Friend">Friend</option>
              <option value="Family">Family</option>
              <option value="Colleague">Colleague</option>
              <option value="Classmate">Classmate</option>
              <option value="Crush">Crush</option>
              <option value="Ex">Ex</option>
              <option value="Mentor">Mentor</option>
              <option value="Other">Other</option>
            </select>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="glass-panel h-64 rounded-2xl animate-pulse bg-[var(--color-surface-highlight)] mb-6"
                />
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 glass-panel rounded-3xl border-dashed border-2 border-[var(--color-border-subtle)]"
            >
              <div className="w-20 h-20 bg-[var(--color-surface-highlight)] rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-[var(--color-text-secondary)]" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No profiles found</h3>
              <p className="text-[var(--color-text-secondary)] text-lg mb-8 max-w-md mx-auto">
                Your universe is empty. Start by adding someone special to your collection.
              </p>
              <button
                onClick={() => router.push("/profiles/new")}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-xl font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300"
              >
                Add Your First Profile
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {profiles.map((profile, index) => (
                <CardProfilePreview
                  key={profile.id}
                  profile={profile}
                  index={index}
                  onClick={() => router.push(`/profiles/${profile.id}`)}
                />
              ))}
            </div>
          )}

          {/* Floating Add Button */}
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push("/profiles/new")}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-pink-500 to-rose-500 text-white p-5 rounded-full shadow-2xl shadow-pink-500/30 z-40 border border-white/10 backdrop-blur-sm"
          >
            <Plus className="w-8 h-8" />
          </motion.button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
