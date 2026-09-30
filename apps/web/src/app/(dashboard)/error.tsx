"use client";

import { useEffect } from "react";
import Button from "@/components/atoms/Button";
import PageShell from "@/components/layout/PageShell";
import StatusNote from "@/components/molecules/StatusNote";

/** Inside the dashboard, a failing page keeps the navbar above it. */
export default function DashboardError({
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
    <div className="page-body">
      <PageShell width="reading" as="main" id="main" className="py-16">
        <StatusNote
          eyebrow="Something broke"
          title="This page hit a problem"
          tape="peach"
          headingLevel="h1"
          actions={<Button onClick={reset}>Try again</Button>}
        >
          Nothing you saved has been lost. Try again, and if it keeps happening, reload the page.
        </StatusNote>
      </PageShell>
    </div>
  );
}
