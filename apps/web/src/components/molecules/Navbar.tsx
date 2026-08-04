"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageShell from "@/components/layout/PageShell";

export default function Navbar() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const onChat = pathname === "/chat";

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b"
      style={{
        height: "var(--navbar-h)",
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <PageShell width="wide" className="flex h-full items-center justify-between">
        <Link
          href="/profiles"
          className="-ml-2 inline-flex h-11 items-center rounded-xl px-2 text-base font-extrabold tracking-tight transition-colors hover:bg-(--surface-2)"
          style={{ color: "var(--text-1)" }}
        >
          Nexia
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/chat"
            aria-current={onChat ? "page" : undefined}
            className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-(--surface-2)"
            style={{
              color: onChat ? "var(--blue-ink)" : "var(--text-2)",
              background: onChat ? "var(--surface-3)" : undefined,
            }}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Ask AI</span>
            <span className="sr-only sm:hidden">Ask AI</span>
          </Link>

          {/* -mr-3 cancels px-3 exactly, so the "Sign out" glyph lands on the
              shell's right edge — the same line the last card ends on. The
              brand link does the same with -ml-2/px-2 on the left. */}
          <button
            onClick={() => void logout()}
            className="-mr-3 inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-(--surface-2) active:scale-[0.97]"
            style={{ color: "var(--text-2)" }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
            <span className="sr-only sm:hidden">Sign out</span>
          </button>
        </div>
      </PageShell>
    </nav>
  );
}
