"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import Navbar from "@/components/molecules/Navbar";
import ProfileForm from "@/features/profiles/components/ProfileForm";
import { createProfile } from "@/features/profiles/api";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/api/client";
import type { ProfileFormValues } from "@/shared/types/profile";

const initialValues: ProfileFormValues = {
  full_name: "",
  relationship_type: "Friend",
  bio: "",
  profession: "",
  long_term_goals: "",
  birthday: "",
  music_preference: "",
  favorite_movie: "",
  favorite_book: "",
  favorite_memory: "",
  tags: [],
  top_songs: [],
  quotes: [],
  movie_genres: [],
  book_genres: [],
  hangout_places: [],
  food_restrictions: [],
  political_views: [],
  associated_song_name: "",
  associated_song_artist: "",
};

export default function NewProfilePage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: ProfileFormValues) => {
    setIsLoading(true);
    try {
      await createProfile(values);
      success("Profile created successfully");
      router.push("/profiles");
    } catch (err: unknown) {
      error(getErrorMessage(err, "Failed to create profile"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--color-bg)] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900">
        <Navbar />

        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 flex items-center justify-between"
          >
            <button
              onClick={() => router.push("/profiles")}
              className="group flex items-center gap-2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              <span className="text-lg">Back to Universe</span>
            </button>
            <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-4xl font-bold text-transparent">
              Create New Profile
            </h1>
          </motion.div>

          <ProfileForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            isSubmitting={isLoading}
            submitLabel="Save Profile"
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
