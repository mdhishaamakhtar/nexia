"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/molecules/Navbar";
import Button from "@/components/atoms/Button";
import StatusNote from "@/components/molecules/StatusNote";
import { ChatProvider } from "@/features/chat/chat-provider";
import { loginRedirectFor } from "@/shared/api/client";

/**
 * Every signed-in page. The navbar and the chat conversation live here, above
 * the pages, so moving between them never remounts either: a chat survives a
 * trip to a profile and back.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status, retry } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "signed-out") {
      router.replace(loginRedirectFor(pathname) ?? "/login");
    }
  }, [status, router, pathname]);

  if (status === "loading" || status === "signed-out") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div
          role="status"
          aria-label="Loading"
          className="h-7 w-7 animate-spin rounded-full border-[3px] border-surface-3 border-t-text-1"
        />
      </div>
    );
  }

  if (status === "unreachable") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <StatusNote
          title="Your slambook is out of reach for a moment"
          headingLevel="h1"
          actions={<Button onClick={retry}>Try again</Button>}
        >
          You&apos;re still signed in. Check your connection, then try again.
        </StatusNote>
      </main>
    );
  }

  return (
    <ChatProvider>
      <a
        href="#main"
        className="sr-only z-[70] rounded-full bg-text-1 px-5 py-2.5 text-[0.9375rem] font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      <Navbar />
      {children}
    </ChatProvider>
  );
}
