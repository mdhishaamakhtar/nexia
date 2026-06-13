"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import BackButton from "@/components/atoms/BackButton";
import ProfileForm from "@/features/profiles/components/ProfileForm";
import { getProfile, toProfileFormValues, updateProfile } from "@/features/profiles/api";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/api/client";
import type { ProfileFormValues } from "@/shared/types/profile";

export default function EditProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: profile, isLoading } = useQuery({
    enabled: !!id,
    queryKey: ["profile", id],
    queryFn: () => getProfile(id),
  });

  const initialValues = useMemo(() => toProfileFormValues(profile), [profile]);

  const handleSubmit = async (values: ProfileFormValues) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await updateProfile(id, values);
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["profile", id] });
      success("Profile updated successfully");
      router.push(`/profiles/${id}`);
    } catch (err: unknown) {
      error(await getErrorMessage(err, "Failed to update profile"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6 lg:px-8">
        <div className="shimmer h-24 rounded-3xl" />
        <div className="shimmer h-44 rounded-3xl" />
        <div className="shimmer h-32 rounded-3xl" />
      </div>
    );
  }

  if (!id || !profile) return null;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <BackButton href={`/profiles/${id}`} label="Back" className="mb-5" />
          <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--text-1)" }}>
            Edit Profile
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-3)" }}>
            Updating {profile.full_name || "this profile"}.
          </p>
        </motion.header>

        <ProfileForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
