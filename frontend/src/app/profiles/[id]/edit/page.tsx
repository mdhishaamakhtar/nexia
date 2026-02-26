"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import Navbar from "@/components/molecules/Navbar";
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
      <ProtectedRoute>
        <div className="min-h-screen bg-[var(--color-bg)]">
          <Navbar />
          <div className="mx-auto max-w-4xl px-4 py-12">
            <div className="glass-panel h-96 rounded-3xl bg-[var(--color-surface-highlight)]" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!id || !profile) return null;

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
              onClick={() => router.push(`/profiles/${id}`)}
              className="group flex items-center gap-2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              <span className="text-lg">Back to Profile</span>
            </button>
            <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-4xl font-bold text-transparent">
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
    </ProtectedRoute>
  );
}
