"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/**
 * The shared shell for every unauthenticated page (login, verify email,
 * forgot/reset password). All five used to repeat the same centring wrapper,
 * washi tape, card, title block, and footer link with small inconsistencies
 * in each copy.
 *
 * `tape` is the one decorative flourish, and it is the only place these pages
 * differ visually — a light cue that they are different steps of one flow.
 */
export default function AuthCard({
  title,
  eyebrow,
  tape = "lavender",
  children,
  footer,
}: {
  title: string;
  eyebrow?: string;
  tape?: "lavender" | "peach" | "blue";
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        <span
          className="washi-tape"
          style={{ width: 96, height: 22, background: `var(--${tape})` }}
          aria-hidden="true"
        />

        <div className="paper rounded-3xl p-7 sm:p-9">
          <header className="mb-7 text-center">
            <h1 className="t-page-title" style={{ color: "var(--text-1)" }}>
              {title}
            </h1>
            {eyebrow && <p className="t-label mt-2">{eyebrow}</p>}
          </header>

          {children}
        </div>

        {footer && (
          <div
            className="mt-5 text-center text-xs leading-relaxed"
            style={{ color: "var(--text-3)" }}
          >
            {footer}
          </div>
        )}
      </motion.div>
    </main>
  );
}

/** Inline text link used in AuthCard footers. */
export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-semibold underline underline-offset-2"
      style={{ color: "var(--text-2)" }}
    >
      {children}
    </Link>
  );
}

/** The shared inline error banner for auth forms. */
export function AuthError({ message }: { message: string }) {
  return (
    <motion.p
      role="alert"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-2 rounded-xl border px-4 py-3 text-xs font-semibold"
      style={{
        background: "var(--red-bg)",
        borderColor: "var(--red-border)",
        color: "var(--red-ink)",
      }}
    >
      {message}
    </motion.p>
  );
}
