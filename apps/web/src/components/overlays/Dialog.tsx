"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/shared/hooks/use-focus-trap";
import { EASE_OUT } from "@/shared/ui/motion";
import Tape, { type TapeColor } from "@/components/atoms/Tape";

/**
 * The one modal: a note pinned over the page.
 *
 * Every overlay in the app is built from the same four things — a flat sheet
 * on the heavier float line, one strip of tape across its top edge, an eyebrow
 * label over a title, and its actions on the bottom right — so a confirmation,
 * an expanded quote and a toast read as one family. (DESIGN.md, "Pinned notes".)
 *
 * The modal contract is here too: focus moves in and is trapped, Escape and a
 * click on the scrim close it unless `dismissible` is false (mid-delete, say),
 * the page behind stops scrolling, and focus returns where it came from.
 */
export default function Dialog({
  open,
  onClose,
  role = "dialog",
  eyebrow,
  title,
  titleId,
  describedBy,
  tape = "lavender",
  tone = "paper",
  dismissible = true,
  showClose = false,
  initialFocus,
  className,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  role?: "dialog" | "alertdialog";
  eyebrow?: string;
  title?: ReactNode;
  titleId?: string;
  describedBy?: string;
  tape?: TapeColor;
  /** The sheet's material: plain paper, the sunk well, or the lavender wash. */
  tone?: "paper" | "sunk" | "lavender";
  dismissible?: boolean;
  /** A close button in the corner, for dialogs with no Cancel of their own. */
  showClose?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <Panel
          onClose={onClose}
          role={role}
          eyebrow={eyebrow}
          title={title}
          titleId={titleId}
          describedBy={describedBy}
          tape={tape}
          tone={tone}
          dismissible={dismissible}
          showClose={showClose}
          initialFocus={initialFocus}
          className={className}
          footer={footer}
        >
          {children}
        </Panel>
      ) : null}
    </AnimatePresence>
  );
}

const TONES = {
  paper: "bg-surface border-line-float",
  sunk: "bg-surface-2 border-line-float",
  lavender: "bg-lavender-soft border-lavender-line-float",
} as const;

function Panel({
  onClose,
  role,
  eyebrow,
  title,
  titleId,
  describedBy,
  tape,
  tone,
  dismissible,
  showClose,
  initialFocus,
  className,
  children,
  footer,
}: {
  onClose: () => void;
  role: "dialog" | "alertdialog";
  eyebrow?: string;
  title?: ReactNode;
  titleId?: string;
  describedBy?: string;
  tape: TapeColor;
  tone: keyof typeof TONES;
  dismissible: boolean;
  showClose: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // False once closing starts. The trap lets go at once, so focus is back on
  // the page while the note fades, and the fading scrim stops taking clicks.
  const present = useIsPresent();
  useFocusTrap(panelRef, {
    active: present,
    onEscape: dismissible ? onClose : undefined,
    initialFocus,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-overlay p-5",
        !present && "pointer-events-none"
      )}
      onClick={dismissible ? onClose : undefined}
    >
      <motion.div
        ref={panelRef}
        role={role}
        aria-modal="true"
        // Focusable from script, so a dialog with no controls can still hold focus.
        tabIndex={-1}
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        initial={{ opacity: 0, y: 14, rotate: -0.6 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.28, ease: EASE_OUT }}
        className={cn(
          "relative flex max-h-[85dvh] w-full flex-col rounded-3xl border-2 outline-none",
          TONES[tone],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Tape color={tape} width={92} height={22} tilt={-2.5} />

        {(eyebrow || title || showClose) && (
          <header className="flex items-start gap-3 px-7 pb-1 pt-8">
            <div className="min-w-0 flex-1">
              {eyebrow && <p className="t-label mb-1.5">{eyebrow}</p>}
              {title && (
                <h2 id={titleId} className="t-section-title text-balance break-words text-text-1">
                  {title}
                </h2>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-3 -mt-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-surface-3 hover:text-text-1"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </header>
        )}

        {children && <div className="min-h-0 overflow-y-auto px-7 pb-7 pt-2">{children}</div>}

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </footer>
        )}
      </motion.div>
    </motion.div>
  );
}
