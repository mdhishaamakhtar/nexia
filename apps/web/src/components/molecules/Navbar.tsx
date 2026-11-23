"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageShell from "@/components/layout/PageShell";
import Logo from "@/components/atoms/Logo";
import { cn } from "@/lib/utils";

const ITEM =
  "inline-flex h-11 items-center justify-center rounded-full px-3.5 text-[0.9375rem] font-semibold transition-colors sm:px-4";

function NavLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        ITEM,
        // Tangerine tint with its dark ink (12:1): the same colour that marks
        // the one action on a page marks where you are.
        current ? "bg-action-soft text-action-ink" : "text-text-2 hover:bg-surface-2"
      )}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { signOut } = useAuth();
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-50 h-(--navbar-h) w-full border-b border-line bg-surface"
    >
      <PageShell width="wide" className="flex h-full items-center justify-between gap-3">
        {/* -ml-2 cancels px-2, so the mark sits on the shell's left edge. */}
        <Link
          href="/profiles"
          className="group/logo -ml-2 inline-flex h-11 items-center rounded-full px-2"
        >
          <Logo />
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <NavLink href="/profiles" current={pathname.startsWith("/profiles")}>
            People
          </NavLink>
          <NavLink href="/chat" current={pathname === "/chat"}>
            Ask Nexia
          </NavLink>

          {/* -mr-3.5 cancels the padding, so the glyph lands on the shell's right edge. */}
          <button
            type="button"
            onClick={() => void signOut()}
            className={cn(ITEM, "-mr-3.5 min-w-11 gap-2 text-text-2 hover:bg-surface-2 sm:-mr-4")}
          >
            <LogOut className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Sign out</span>
          </button>
        </div>
      </PageShell>
    </nav>
  );
}
