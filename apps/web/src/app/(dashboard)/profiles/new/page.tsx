"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BackButton from "@/components/atoms/BackButton";
import ProfileForm from "@/features/profiles/components/ProfileForm";
import { createProfile } from "@/features/profiles/api";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/api/client";
import type { ProfileFormValues } from "@/shared/types/profile";
import { useQueryClient } from "@tanstack/react-query";

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
  notes: "",
  tags: [],
  top_songs: [],
  quotes: [],
  favorite_memories: [],
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
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: ProfileFormValues) => {
    setIsLoading(true);
    try {
      await createProfile(values);
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      success("Profile created successfully");
      router.push("/profiles");
    } catch (err: unknown) {
      error(await getErrorMessage(err, "Failed to create profile"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <BackButton href="/profiles" label="Back" className="mb-5" />
          <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--text-1)" }}>
            New Profile
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-3)" }}>
            Add someone new to your slambook.
          </p>
        </motion.header>

        <ProfileForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isSubmitting={isLoading}
          submitLabel="Save Profile"
        />
      </div>
    </div>
  );
}
