"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour for a dialog panel while `active`: focus moves inside (to
 * `initialFocus`, or the first control), Tab cycles within it, Escape calls
 * `onEscape`, the page behind stops scrolling, and focus returns to whatever
 * had it when the dialog closes.
 */
export function useFocusTrap(
  panelRef: RefObject<HTMLElement | null>,
  {
    active,
    onEscape,
    initialFocus,
  }: {
    active: boolean;
    onEscape?: () => void;
    initialFocus?: RefObject<HTMLElement | null>;
  }
) {
  // The latest handler, read at keypress time, so a parent passing a fresh
  // closure each render does not tear the trap down and bounce focus.
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;

    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    (initialFocus?.current ?? panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();
    document.documentElement.classList.add("modal-open");

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && escapeRef.current) {
        e.stopPropagation();
        escapeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusables = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
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
      document.documentElement.classList.remove("modal-open");
      previous?.focus?.();
    };
  }, [active, initialFocus, panelRef]);
}
