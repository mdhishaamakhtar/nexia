"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import BackButton from "@/components/atoms/BackButton";
import PageShell from "@/components/layout/PageShell";
import ProfileForm from "@/features/profiles/components/ProfileForm";
import { createProfile, toProfileFormValues } from "@/features/profiles/api";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/api/client";
import type { ProfileFormValues } from "@/shared/types/profile";

export default function NewProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      const profile = await createProfile(values);
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      success(`${values.full_name} is in your slambook`);
      router.push(`/profiles/${profile.id}`);
    } catch (err: unknown) {
      error(await getErrorMessage(err, "Couldn't save that profile"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-body">
      <PageShell width="reading" as="main" className="py-8 sm:py-10">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-7"
        >
          <BackButton href="/profiles" label="Back" className="mb-4" />
          <h1 className="t-page-title" style={{ color: "var(--text-1)" }}>
            New profile
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-3)" }}>
            Add someone new to your slambook.
          </p>
        </motion.header>

        <ProfileForm
          initialValues={toProfileFormValues()}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save profile"
          cancelHref="/profiles"
        />
      </PageShell>
    </div>
  );
}
