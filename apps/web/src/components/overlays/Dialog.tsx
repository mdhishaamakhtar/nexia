"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/shared/hooks/use-focus-trap";
import { EASE_OUT } from "@/shared/ui/motion";

/**
 * The one modal: a white sheet over a dimmed page.
 *
 * Every overlay in the app is built from the same things — a flat rounded
 * sheet, a title, and its actions on the bottom right — so a confirmation and
 * an expanded quote read as one family. (DESIGN.md, "Overlays".)
 *
 * The modal contract is here too: focus moves in and is trapped, Escape and a
 * click on the scrim close it unless `dismissible` is false (mid-delete, say),
 * the page behind stops scrolling, and focus returns where it came from.
 */
export default function Dialog({
  open,
  onClose,
  role = "dialog",
  title,
  titleId,
  describedBy,
  tone = "plain",
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
  title?: ReactNode;
  titleId?: string;
  describedBy?: string;
  /**
   * The sheet's fill: white, or the colour of whoever it is about. `person`
   * needs a `person-*` class in `className` to know whose.
   */
  tone?: "plain" | "person";
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
          title={title}
          titleId={titleId}
          describedBy={describedBy}
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
  plain: "bg-surface text-text-1",
  person: "card-person",
} as const;

function Panel({
  onClose,
  role,
  title,
  titleId,
  describedBy,
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
  title?: ReactNode;
  titleId?: string;
  describedBy?: string;
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
  // the page while the sheet fades, and the fading scrim stops taking clicks.
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
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.26, ease: EASE_OUT }}
        className={cn(
          "relative flex max-h-[85dvh] w-full flex-col rounded-[2rem] outline-none",
          TONES[tone],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showClose) && (
          <header className="flex items-start gap-3 px-7 pb-1 pt-7 sm:px-8">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id={titleId} className="t-section-title text-balance break-words">
                  {title}
                </h2>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={cn(
                  "-mr-2.5 -mt-2.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
                  tone === "person" ? "hover:bg-white/60" : "text-text-2 hover:bg-surface-2"
                )}
              >
                <X className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
              </button>
            )}
          </header>
        )}

        {children && (
          <div className="min-h-0 overflow-y-auto px-7 pb-7 pt-2 sm:px-8 sm:pb-8">{children}</div>
        )}

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
            {footer}
          </footer>
        )}
      </motion.div>
    </motion.div>
  );
}
