"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
      error(getErrorMessage(err, "Failed to update profile"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-4">
        <div className="h-44 rounded-2xl shimmer" />
        <div className="h-28 rounded-2xl shimmer" />
        <div className="h-28 rounded-2xl shimmer" />
      </div>
    );
  }

  if (!id || !profile) return null;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-center justify-between"
        >
          <Link
            href={`/profiles/${id}`}
            prefetch
            className="group flex items-center gap-2 transition-colors text-sm"
            style={{ color: "var(--text-3)" }}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            back
          </Link>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>
            Edit Profile
          </h1>
        </motion.div>

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
