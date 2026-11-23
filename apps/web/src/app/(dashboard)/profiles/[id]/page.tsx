"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, Loader2, Trash2 } from "lucide-react";
import Button from "@/components/atoms/Button";
import BackButton from "@/components/atoms/BackButton";
import Tooltip from "@/components/atoms/Tooltip";
import PageShell from "@/components/layout/PageShell";
import ConfirmDialog from "@/components/molecules/ConfirmDialog";
import StatusNote from "@/components/molecules/StatusNote";
import ProfileSheet from "@/features/profiles/components/ProfileSheet";
import { isNotFound, useDeleteProfile, useProfile } from "@/features/profiles/hooks";
import { exportProfilePdf } from "@/features/profiles/exportProfilePdf";
import { getErrorMessage } from "@/shared/api/client";
import { useToast } from "@/shared/ui/toast";
import { enter } from "@/shared/ui/motion";

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: profile, isPending, error, refetch } = useProfile(id);
  const deletion = useDeleteProfile();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (profile) document.title = `${profile.full_name} | Nexia`;
  }, [profile]);

  const handleDelete = () =>
    deletion.mutate(id, {
      onSuccess: () => {
        toast.success(`${profile?.full_name ?? "Profile"} was removed from your slambook`);
        router.push("/profiles");
      },
      onError: async (err) => {
        setConfirmingDelete(false);
        toast.error(await getErrorMessage(err, "Couldn't delete that profile. Try again."));
      },
    });

  const handleExport = async () => {
    if (!profile || isExporting) return;
    setIsExporting(true);
    try {
      await exportProfilePdf(profile);
      toast.success("PDF saved");
    } catch {
      toast.error("Couldn't make the PDF. Try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // The controls sit inside the block of the person's colour, so they are
  // frosted white in that person's ink rather than the neutral page buttons.
  const toolbar = (
    <div className="flex items-center justify-between gap-3">
      <BackButton href="/profiles" label="Your people" onColor collapse />
      <div className="flex items-center gap-2">
        <Tooltip label="Save as PDF">
          <Button
            onClick={handleExport}
            variant="frost"
            size="icon"
            aria-label="Save profile as PDF"
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-[1.125rem] w-[1.125rem] animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
            )}
          </Button>
        </Tooltip>
        <Tooltip label="Delete">
          <Button
            onClick={() => setConfirmingDelete(true)}
            variant="frost"
            size="icon"
            aria-label="Delete profile"
          >
            <Trash2 className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          </Button>
        </Tooltip>
        <Button href={`/profiles/${id}/edit`} size="sm" className="px-5">
          Edit
        </Button>
      </div>
    </div>
  );

  return (
    <div className="page-body">
      <PageShell width="wide" as="main" id="main" className="pb-24 pt-3 sm:pt-4">
        {isPending ? (
          // The same shape as the coloured block that replaces it, so nothing shifts on arrival.
          <div
            className="shimmer h-[26rem] rounded-[2rem] sm:rounded-[2.5rem]"
            aria-label="Loading profile"
            role="status"
          />
        ) : isNotFound(error) ? (
          <motion.div {...enter(0, 12)} className="pt-10">
            <StatusNote
              title="This person isn't in your slambook"
              headingLevel="h1"
              actions={<Button href="/profiles">Back to your slambook</Button>}
            >
              They may have been deleted, or the link is from someone else&apos;s account.
            </StatusNote>
          </motion.div>
        ) : error || !profile ? (
          <motion.div {...enter(0, 12)} className="pt-10">
            <StatusNote
              title="This profile didn't load"
              headingLevel="h1"
              actions={
                <>
                  <Button href="/profiles" variant="secondary">
                    Your people
                  </Button>
                  <Button onClick={() => void refetch()}>Try again</Button>
                </>
              }
            >
              Check your connection and try again.
            </StatusNote>
          </motion.div>
        ) : (
          <ProfileSheet profile={profile} toolbar={toolbar} />
        )}
      </PageShell>

      <ConfirmDialog
        isOpen={confirmingDelete}
        title={`Delete ${profile?.full_name ?? "this profile"}?`}
        description="Their profile, songs, quotes and memories go with it. This can't be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
        isConfirming={deletion.isPending}
      />
    </div>
  );
}
