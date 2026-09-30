"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LogoMark } from "@/components/atoms/Logo";
import Tape, { type TapeColor } from "@/components/atoms/Tape";
import { enter } from "@/shared/ui/motion";

/**
 * The shell for every signed-out page (sign in, verify email, forgot and
 * reset password): one pinned sheet, centred. The tape colour is the only
 * thing that varies, a light cue that these are steps of one flow.
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
  tape?: TapeColor;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-(--gutter) py-10">
      <motion.div {...enter(0, 16)} className="relative w-full max-w-sm">
        <Link
          href="/"
          aria-label="Nexia home"
          className="group/logo mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-2xl"
        >
          <LogoMark size={44} />
        </Link>
        <div className="paper relative rounded-3xl p-7 sm:p-9">
          <Tape color={tape} width={96} height={22} />
          <header className="mb-7 text-center">
            <h1 className="t-page-title text-balance text-text-1">{title}</h1>
            {eyebrow && <p className="t-label mt-2">{eyebrow}</p>}
          </header>
          {children}
        </div>

        {footer && (
          <div className="mt-5 text-center text-xs leading-relaxed text-text-3">{footer}</div>
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
      className="font-semibold text-text-2 underline underline-offset-2 hover:text-text-1"
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
          ? "rounded-xl border border-red-border bg-red-bg px-4 py-3 text-[13px] font-semibold leading-snug text-red-ink"
          : "rounded-xl border border-green-line bg-green-soft px-4 py-3 text-[13px] font-semibold leading-snug text-green-ink"
      }
    >
      {children}
    </motion.div>
  );
}
