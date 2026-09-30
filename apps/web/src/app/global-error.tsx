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
          <div className="paper relative w-full max-w-md rounded-3xl px-7 pb-7 pt-9 text-center">
            <span
              className="washi-tape"
              style={{ width: 92, height: 22, background: "var(--peach)" }}
              aria-hidden="true"
            />
            <p className="t-label mb-2">Something broke</p>
            <h1 className="t-section-title text-text-1">Nexia couldn&apos;t load</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-text-2">
              Nothing you saved has been lost. Try again in a moment.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-peach-line bg-peach px-5 text-sm font-semibold text-peach-ink"
            >
              Try again
            </button>
            {error.digest && <p className="mt-4 text-xs text-text-3">Reference: {error.digest}</p>}
          </div>
        </main>
      </body>
    </html>
  );
}
