"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, Edit, Loader2, Trash2 } from "lucide-react";
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

  return (
    <div className="page-body">
      <PageShell width="reading" as="main" id="main" className="py-8 sm:py-10">
        <motion.div {...enter(0, -8)} className="mb-5 flex items-center justify-between gap-3">
          <BackButton href="/profiles" label="Back" />

          {profile && (
            <div className="flex items-center gap-2">
              <Button href={`/profiles/${id}/edit`} variant="secondary" size="sm">
                <Edit className="h-3.5 w-3.5" aria-hidden="true" /> Edit
              </Button>
              <Tooltip label="Save as PDF">
                <Button
                  onClick={handleExport}
                  variant="secondary"
                  size="icon"
                  aria-label="Save profile as PDF"
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </Tooltip>
              <Tooltip label="Delete">
                <Button
                  onClick={() => setConfirmingDelete(true)}
                  variant="destructive"
                  size="icon"
                  aria-label="Delete profile"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Tooltip>
            </div>
          )}
        </motion.div>

        {isPending ? (
          // Same shell and padding as the loaded state, so nothing shifts on arrival.
          <div
            className="shimmer h-[32rem] rounded-[28px]"
            aria-label="Loading profile"
            role="status"
          />
        ) : isNotFound(error) ? (
          <StatusNote
            eyebrow="Not found"
            title="This person isn't in your slambook"
            headingLevel="h1"
            actions={<Button href="/profiles">Back to your slambook</Button>}
          >
            They may have been deleted, or the link is from someone else&apos;s account.
          </StatusNote>
        ) : error || !profile ? (
          <StatusNote
            eyebrow="Couldn't load"
            title="This profile didn't load"
            tape="peach"
            headingLevel="h1"
            actions={<Button onClick={() => void refetch()}>Try again</Button>}
          >
            Check your connection and try again.
          </StatusNote>
        ) : (
          <ProfileSheet profile={profile} />
        )}
      </PageShell>

      <ConfirmDialog
        isOpen={confirmingDelete}
        eyebrow="Delete profile"
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
