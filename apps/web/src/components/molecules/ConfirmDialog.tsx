"use client";

import { useId, useRef } from "react";
import Button from "@/components/atoms/Button";
import Dialog from "@/components/overlays/Dialog";

interface ConfirmDialogProps {
  isOpen: boolean;
  /** A short label over the title, naming the action ("Delete profile"). */
  eyebrow?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions get the red button and peach tape; everything else lavender. */
  tone?: "destructive" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

/**
 * Asks before something that can't be taken back. Focus starts on Cancel, so a
 * stray Enter never confirms; while the action runs the note can't be
 * dismissed out from under it.
 */
export default function ConfirmDialog({
  isOpen,
  eyebrow,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "destructive",
  onConfirm,
  onCancel,
  isConfirming = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={isOpen}
      onClose={onCancel}
      role="alertdialog"
      eyebrow={eyebrow}
      title={title}
      titleId={titleId}
      describedBy={descId}
      tape={tone === "destructive" ? "peach" : "lavender"}
      dismissible={!isConfirming}
      initialFocus={cancelRef}
      className="max-w-md"
      footer={
        <>
          <Button ref={cancelRef} variant="ghost" onClick={onCancel} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} isLoading={isConfirming}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p id={descId} className="t-body text-text-2">
        {description}
      </p>
    </Dialog>
  );
}
