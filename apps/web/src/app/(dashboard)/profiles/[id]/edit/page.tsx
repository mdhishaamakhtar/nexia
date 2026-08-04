"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import BackButton from "@/components/atoms/BackButton";
import PageShell from "@/components/layout/PageShell";
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
      success("Changes saved");
      router.push(`/profiles/${id}`);
    } catch (err: unknown) {
      error(await getErrorMessage(err, "Couldn't save those changes"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      // Same shell and padding as the loaded state, so nothing shifts on arrival.
      <div className="page-body">
        <PageShell width="reading" className="space-y-4 py-8 sm:py-10">
          <div className="shimmer h-24 rounded-3xl" />
          <div className="shimmer h-44 rounded-3xl" />
          <div className="shimmer h-32 rounded-3xl" />
        </PageShell>
      </div>
    );
  }

  if (!id || !profile) return null;

  return (
    <div className="page-body">
      <PageShell width="reading" as="main" className="py-8 sm:py-10">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-7"
        >
          <BackButton href={`/profiles/${id}`} label="Back" className=" mb-4" />
          <h1 className="t-page-title" style={{ color: "var(--text-1)" }}>
            Edit profile
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-3)" }}>
            Updating {profile.full_name || "this profile"}.
          </p>
        </motion.header>

        <ProfileForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save changes"
          cancelHref={`/profiles/${id}`}
        />
      </PageShell>
    </div>
  );
}
