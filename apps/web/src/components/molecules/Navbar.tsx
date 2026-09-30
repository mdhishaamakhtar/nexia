"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageShell from "@/components/layout/PageShell";
import Logo from "@/components/atoms/Logo";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { signOut } = useAuth();
  const pathname = usePathname();
  const onChat = pathname === "/chat";

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-50 h-(--navbar-h) w-full border-b border-line bg-surface"
    >
      <PageShell width="wide" className="flex h-full items-center justify-between">
        {/* -ml-2 cancels px-2, so the mark sits on the shell's left edge. */}
        <Link
          href="/profiles"
          className="group/logo -ml-2 inline-flex h-11 items-center rounded-xl px-2 transition-colors hover:bg-surface-2"
        >
          <Logo />
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/chat"
            aria-current={onChat ? "page" : undefined}
            className={cn(
              "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-surface-2",
              // Deep blue on the pressed-paper fill: 7.5:1, where the lighter
              // blue ink measured 4.1:1 and failed.
              onChat ? "bg-surface-3 text-blue-ink-deep" : "text-text-2"
            )}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Ask Nexia</span>
          </Link>

          {/* -mr-3 cancels px-3, so the glyph lands on the shell's right edge. */}
          <button
            type="button"
            onClick={() => void signOut()}
            className="-mr-3 inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Sign out</span>
          </button>
        </div>
      </PageShell>
    </nav>
  );
}
