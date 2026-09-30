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
          className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-blue-ink"
        />
      </div>
    );
  }

  if (status === "unreachable") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <StatusNote
          eyebrow="Can't reach Nexia"
          title="Your slambook is out of reach for a moment"
          tape="peach"
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
        className="sr-only z-[70] rounded-xl bg-surface px-4 py-2 text-sm font-semibold text-text-1 focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      <Navbar />
      {children}
    </ChatProvider>
  );
}
