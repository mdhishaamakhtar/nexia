"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Stops unsaved edits being lost on the way out.
 *
 * In-app links (Cancel, Back, the navbar, a chat link) are caught before Next
 * handles them and turned into a `pendingHref`, which the page answers with its
 * own ConfirmDialog — the app's dialog, not the browser's. A reload or a closed
 * tab can only get the browser's native "Leave site?" prompt; no page may
 * restyle that one.
 */
export function useLeaveGuard(active: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const bypass = useRef(false);

  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!bypass.current) e.preventDefault();
    };

    const onClick = (e: MouseEvent) => {
      if (bypass.current || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;

      // Capture phase on the document runs before React's own handlers, and
      // stopping it here means Next's <Link> never starts the navigation.
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(`${url.pathname}${url.search}${url.hash}`);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active]);

  const stay = useCallback(() => setPendingHref(null), []);
  const leave = useCallback(() => {
    if (!pendingHref) return;
    bypass.current = true;
    setPendingHref(null);
    router.push(pendingHref);
  }, [pendingHref, router]);

  return { pendingHref, stay, leave };
}
