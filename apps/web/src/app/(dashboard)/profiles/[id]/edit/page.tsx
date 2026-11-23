"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BackButton from "@/components/atoms/BackButton";
import Button from "@/components/atoms/Button";
import PageShell from "@/components/layout/PageShell";
import StatusNote from "@/components/molecules/StatusNote";
import Avatar from "@/features/profiles/components/Avatar";
import ProfileForm from "@/features/profiles/components/ProfileForm";
import { identityFor } from "@/features/profiles/identity";
import { isNotFound, useProfile, useUpdateProfile } from "@/features/profiles/hooks";
import { toFormValues } from "@/features/profiles/form";
import { cn } from "@/lib/utils";
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
    // The person's colour tints every panel of the form, as it does their page.
    <div className={cn("page-body", profile && identityFor(profile.id).className)}>
      <PageShell width="reading" as="main" id="main" className="pb-10 pt-6 sm:pt-8">
        <motion.header {...enter(0, -8)} className="mb-8">
          <BackButton href={`/profiles/${id}`} label="Back" className="mb-6" />
          <div className="flex items-center gap-4">
            {profile && (
              <Avatar
                id={profile.id}
                name={profile.full_name}
                className="h-16 w-16 sm:h-20 sm:w-20"
              />
            )}
            <div className="min-w-0">
              <h1 className="t-page-title text-text-1">Edit profile</h1>
              {profile && (
                <p className="t-body mt-1.5 break-words text-text-2">
                  Updating {profile.full_name}.
                </p>
              )}
            </div>
          </div>
        </motion.header>

        {isPending ? (
          <div
            className="shimmer h-[40rem] rounded-[1.75rem]"
            role="status"
            aria-label="Loading profile"
          />
        ) : isNotFound(error) ? (
          <StatusNote
            title="This person isn't in your slambook"
            actions={<Button href="/profiles">Back to your slambook</Button>}
          />
        ) : error || !profile ? (
          <StatusNote
            title="This profile didn't load"
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
