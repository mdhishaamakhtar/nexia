"use client";

import { useEffect } from "react";
import Link from "next/link";
import Button from "@/components/atoms/Button";
import { LogoMark } from "@/components/atoms/Logo";
import StatusNote from "@/components/molecules/StatusNote";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center px-(--gutter) py-10"
    >
      <Link
        href="/"
        aria-label="Nexia home"
        className="group/logo mb-6 flex h-16 w-16 items-center justify-center rounded-full"
      >
        <LogoMark size={56} />
      </Link>
      <StatusNote
        title="This page hit a problem"
        headingLevel="h1"
        actions={
          <>
            <Button onClick={reset}>Try again</Button>
            <Button href="/profiles" variant="ghost">
              Open your slambook
            </Button>
          </>
        }
      >
        Nothing you saved has been lost. Try again, and if it keeps happening, reload the page.
      </StatusNote>
    </main>
  );
}
