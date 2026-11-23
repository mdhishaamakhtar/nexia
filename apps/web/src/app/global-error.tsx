"use client";

import "./globals.css";

/**
 * The last resort, when the root layout itself failed: it has to bring its
 * own <html> and stylesheet. It never shows the raw error, which is written
 * for developers and can carry internals; the digest is enough to find it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-dvh items-center justify-center px-5">
          <div className="panel w-full max-w-lg rounded-[2rem] px-7 py-10 text-center sm:px-10 sm:py-12">
            <h1 className="t-section-title text-text-1">Nexia couldn&apos;t load</h1>
            <p className="t-body mx-auto mt-2.5 max-w-sm text-text-2">
              Nothing you saved has been lost. Try again in a moment.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-7 inline-flex min-h-12 cursor-pointer items-center rounded-full bg-action px-6 text-base font-bold text-action-ink"
            >
              Try again
            </button>
            {error.digest && <p className="mt-5 text-sm text-text-3">Reference: {error.digest}</p>}
          </div>
        </main>
      </body>
    </html>
  );
}
