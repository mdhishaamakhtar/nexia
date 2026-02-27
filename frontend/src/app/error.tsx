"use client";

import { useEffect } from "react";
import Button from "@/components/atoms/Button";

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
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-7">
        <h2 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>
          Something went wrong
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>
          Please try again. If this keeps happening, refresh the page.
        </p>
        <div className="mt-5">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
