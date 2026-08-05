"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef } from "react";
import Button from "@/components/atoms/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isConfirming = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Move focus into the dialog so keyboard and screen-reader users land here
    // rather than continuing behind the scrim, and restore it on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isConfirming) {
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;

      // Keep Tab inside the dialog while it is open.
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      if (!focusables?.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, isConfirming, onCancel]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: "var(--overlay)" }}
          onClick={onCancel}
        >
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            // Float line, not a card hairline: a dialog sits on the scrim, and
            // a 1px `--border-mid` edge there is lighter than the scrim itself,
            // so it disappears into the silhouette. See globals.css.
            className="paper relative w-full max-w-sm rounded-3xl border-2 p-7"
            style={{ borderColor: "var(--line-float)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="washi-tape"
              style={{ width: 88, height: 22, background: "var(--peach)" }}
              aria-hidden="true"
            />

            <h2 id={titleId} className="t-section-title mb-2" style={{ color: "var(--text-1)" }}>
              {title}
            </h2>
            <p id={descId} className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
              {description}
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={onCancel} disabled={isConfirming}>
                {cancelLabel}
              </Button>
              <Button variant="destructive" onClick={onConfirm} isLoading={isConfirming}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
