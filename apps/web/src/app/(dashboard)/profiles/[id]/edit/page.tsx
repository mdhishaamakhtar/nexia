"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BackButton from "@/components/atoms/BackButton";
import Button from "@/components/atoms/Button";
import PageShell from "@/components/layout/PageShell";
import StatusNote from "@/components/molecules/StatusNote";
import ProfileForm from "@/features/profiles/components/ProfileForm";
import { isNotFound, useProfile, useUpdateProfile } from "@/features/profiles/hooks";
import { toFormValues } from "@/features/profiles/form";
import { getErrorMessage } from "@/shared/api/client";
import { useToast } from "@/shared/ui/toast";
import { enter } from "@/shared/ui/motion";

export default function EditProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: profile, isPending, error, refetch } = useProfile(id);
  const update = useUpdateProfile(id);

  useEffect(() => {
    if (profile) document.title = `Editing ${profile.full_name} | Nexia`;
  }, [profile]);

  return (
    <div className="page-body">
      <PageShell width="reading" as="main" id="main" className="py-8 sm:py-10">
        <motion.header {...enter(0, -8)} className="mb-7">
          <BackButton href={`/profiles/${id}`} label="Back" className="mb-4" />
          <h1 className="t-page-title text-text-1">Edit profile</h1>
          {profile && <p className="mt-1.5 text-sm text-text-3">Updating {profile.full_name}.</p>}
        </motion.header>

        {isPending ? (
          <div
            className="shimmer h-[40rem] rounded-[28px]"
            role="status"
            aria-label="Loading profile"
          />
        ) : isNotFound(error) ? (
          <StatusNote
            eyebrow="Not found"
            title="This person isn't in your slambook"
            actions={<Button href="/profiles">Back to your slambook</Button>}
          />
        ) : error || !profile ? (
          <StatusNote
            eyebrow="Couldn't load"
            title="This profile didn't load"
            tape="peach"
            actions={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        ) : (
          <ProfileForm
            // Keyed so a background refetch can never swap the values out from
            // under someone mid-edit: the form reads its defaults once.
            key={profile.id}
            initialValues={toFormValues(profile)}
            isSubmitting={update.isPending}
            submitLabel="Save changes"
            cancelHref={`/profiles/${id}`}
            onSubmit={(payload) =>
              update
                .mutateAsync(payload)
                .then(() => {
                  toast.success("Changes saved");
                  router.push(`/profiles/${id}`);
                })
                .catch(async (err) =>
                  toast.error(await getErrorMessage(err, "Couldn't save those changes. Try again."))
                )
            }
          />
        )}
      </PageShell>
    </div>
  );
}
