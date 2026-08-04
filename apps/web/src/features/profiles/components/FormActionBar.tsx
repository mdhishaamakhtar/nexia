"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Check } from "lucide-react";
import Button from "@/components/atoms/Button";
import PageShell from "@/components/layout/PageShell";

/**
 * The profile form's save bar.
 *
 * The old version was a `sticky bottom-4` glass pill floating over the form —
 * a card nested inside a card, drifting over content, with no sense of whether
 * anything had actually changed. This is a real anchored action bar instead:
 * it sits flush on the bottom edge, its inner content shares the form's
 * reading column so the Save button lines up with the fields above it, and it
 * reports save state rather than just offering a button.
 *
 * Save stays disabled until something is genuinely dirty, and leaving with
 * unsaved edits prompts first.
 */
export default function FormActionBar({
  isDirty,
  isSubmitting,
  submitLabel,
  cancelHref,
}: {
  isDirty: boolean;
  isSubmitting: boolean;
  submitLabel: string;
  cancelHref: string;
}) {
  // Guard against losing a half-filled profile to a stray reload or back swipe.
  useEffect(() => {
    if (!isDirty || isSubmitting) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, isSubmitting]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <PageShell width="reading" className="flex items-center gap-3 py-3">
        <p
          className="hidden min-w-0 flex-1 items-center gap-1.5 text-[13px] font-semibold sm:flex"
          style={{ color: isDirty ? "var(--text-2)" : "var(--text-3)" }}
        >
          {isDirty ? (
            <>
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "var(--peach)" }}
                aria-hidden="true"
              />
              Unsaved changes
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Nothing to save yet
            </>
          )}
        </p>

        <div className="flex flex-1 items-center gap-2 sm:flex-none">
          <Link href={cancelHref} className="flex-1 sm:flex-none">
            <Button type="button" variant="ghost" className="w-full">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={!isDirty}
            className="flex-1 px-7 sm:flex-none"
          >
            {submitLabel}
          </Button>
        </div>
      </PageShell>
    </div>
  );
}
