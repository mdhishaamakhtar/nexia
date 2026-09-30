"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BackButton from "@/components/atoms/BackButton";
import PageShell from "@/components/layout/PageShell";
import ProfileForm from "@/features/profiles/components/ProfileForm";
import { useCreateProfile } from "@/features/profiles/hooks";
import { toFormValues } from "@/features/profiles/form";
import { getErrorMessage } from "@/shared/api/client";
import { useToast } from "@/shared/ui/toast";
import { enter } from "@/shared/ui/motion";

const EMPTY = toFormValues();

export default function NewProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const creation = useCreateProfile();

  return (
    <div className="page-body">
      <PageShell width="reading" as="main" id="main" className="py-8 sm:py-10">
        <motion.header {...enter(0, -8)} className="mb-7">
          <BackButton href="/profiles" label="Back" className="mb-4" />
          <h1 className="t-page-title text-text-1">New profile</h1>
          <p className="mt-1.5 text-sm text-text-3">Add someone new to your slambook.</p>
        </motion.header>

        <ProfileForm
          initialValues={EMPTY}
          isSubmitting={creation.isPending}
          submitLabel="Save profile"
          cancelHref="/profiles"
          onSubmit={(payload) =>
            creation
              .mutateAsync(payload)
              .then(({ id }) => {
                toast.success(`${payload.full_name.trim()} is in your slambook`);
                router.push(`/profiles/${id}`);
              })
              .catch(async (err) =>
                toast.error(await getErrorMessage(err, "Couldn't save that profile. Try again."))
              )
          }
        />
      </PageShell>
    </div>
  );
}
