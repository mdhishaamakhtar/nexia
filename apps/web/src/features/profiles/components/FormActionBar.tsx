"use client";

import { Check } from "lucide-react";
import Button from "@/components/atoms/Button";
import PageShell from "@/components/layout/PageShell";

/**
 * The profile form's save bar: anchored to the bottom edge, its content on the
 * form's reading column so Save lines up with the fields above it, and it says
 * whether anything has changed rather than just offering a button.
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
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <PageShell width="reading" className="flex items-center gap-3 py-3">
        <p
          aria-live="polite"
          className={
            "hidden min-w-0 flex-1 items-center gap-1.5 text-[13px] font-semibold sm:flex " +
            (isDirty ? "text-text-2" : "text-text-3")
          }
        >
          {isDirty ? (
            <>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-peach-ink" aria-hidden="true" />
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
          <Button href={cancelHref} variant="ghost" className="flex-1 sm:flex-none">
            Cancel
          </Button>
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
