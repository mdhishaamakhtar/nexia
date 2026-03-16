"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
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
      error(getErrorMessage(err, "Failed to create profile"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-center justify-between"
        >
          <button
            onClick={() => router.push("/profiles")}
            className="group flex items-center gap-2 transition-colors text-sm"
            style={{ color: "var(--text-3)" }}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            back
          </button>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>
            New Profile
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
  );
}
