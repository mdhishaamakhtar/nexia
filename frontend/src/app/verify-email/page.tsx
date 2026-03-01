"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97, rotate: -2 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: -0.5 }}
        transition={{ duration: 0.5, ease: "easeOut", type: "spring" }}
        className="w-full max-w-sm relative"
      >
        <div
          className="washi-tape-accent w-24 h-6 !top-[-10px]"
          style={{ opacity: 0.8, background: "var(--mint)" }}
        />

        <div className="glass-panel rounded-3xl p-7 sm:p-9 scrapbook-card">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-center mb-8"
          >
            <div className="text-4xl mb-4">✉️</div>
            <h1
              className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2"
              style={{ color: "var(--text-1)" }}
            >
              Check your email
            </h1>
            <p
              className="text-[10px] font-semibold tracking-[0.22em] uppercase"
              style={{ color: "var(--text-3)" }}
            >
              almost there
            </p>
          </motion.div>

          <div className="space-y-4 text-center">
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
              We&apos;ve sent a verification link to your email address. Click the link to activate
              your Nexia account.
            </p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              The link expires in <strong style={{ color: "var(--text-2)" }}>24 hours</strong>.
              Check your spam folder if you don&apos;t see it.
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "var(--text-3)" }}>
          <Link
            href="/login"
            className="underline underline-offset-2 transition-colors"
            style={{ color: "var(--text-2)" }}
          >
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
