"use client";

import { useEffect, type RefObject } from "react";

/**
 * Closes a popover when the pointer goes down outside `refs` or focus leaves
 * them. Escape is left to the popover itself, which also has to return focus
 * to its trigger.
 */
export function useDismiss(
  refs: Array<RefObject<HTMLElement | null>>,
  open: boolean,
  onDismiss: () => void
) {
  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node && refs.some((ref) => ref.current?.contains(target));

    const onPointerDown = (e: PointerEvent) => {
      if (!inside(e.target)) onDismiss();
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!inside(e.target)) onDismiss();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, onDismiss, refs]);
}
