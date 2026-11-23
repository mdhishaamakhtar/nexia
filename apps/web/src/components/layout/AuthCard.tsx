"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LogoMark } from "@/components/atoms/Logo";
import { enter } from "@/shared/ui/motion";

/**
 * The shell for every signed-out page (sign in, verify email, forgot and
 * reset password): the mark, then one neutral panel, centred. The fields
 * inside stay white.
 */
export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  /** A line under the title. Only the sign-in page has one: the tagline. */
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-(--gutter) py-10">
      <motion.div {...enter(0, 16)} className="w-full max-w-[27rem]">
        <Link
          href="/"
          aria-label="Nexia home"
          className="group/logo mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
        >
          <LogoMark size={56} />
        </Link>
        <div className="panel rounded-[2rem] px-6 py-8 sm:px-9 sm:py-10">
          <header className="mb-7 text-center">
            <h1 className="text-balance text-[2.125rem] font-bold leading-[1.05] tracking-[-0.03em] text-text-1 sm:text-[2.5rem]">
              {title}
            </h1>
            {subtitle && <p className="t-body mt-2 text-text-2">{subtitle}</p>}
          </header>
          {children}
        </div>

        {footer && (
          <div className="mt-5 text-center text-[0.9375rem] leading-relaxed text-text-2">
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
      className="font-semibold text-text-1 underline underline-offset-[3px] hover:decoration-2"
    >
      {children}
    </Link>
  );
}

/** The shared inline message banner for auth forms. */
export function AuthNotice({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <motion.div
      role={tone === "error" ? "alert" : "status"}
      {...enter(0, -4)}
      className={
        tone === "error"
          ? "rounded-[1.125rem] bg-red-bg px-4 py-3 text-[0.9375rem] font-semibold leading-snug text-red-ink"
          : "rounded-[1.125rem] bg-mint-soft px-4 py-3 text-[0.9375rem] font-semibold leading-snug text-mint-ink"
      }
    >
      {children}
    </motion.div>
  );
}
