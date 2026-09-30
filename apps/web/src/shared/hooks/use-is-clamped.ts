"use client";

import { useEffect, useState, type RefObject } from "react";

/** Whether a line-clamped element is hiding text, re-checked as it resizes. */
export function useIsClamped(ref: RefObject<HTMLElement | null>, content: unknown): boolean {
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setClamped(el.scrollHeight - el.clientHeight > 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, content]);

  return clamped;
}
