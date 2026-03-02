"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { verifyEmail } from "@/features/auth/api";

function VerifyEmailConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">(() =>
    token ? "loading" : "error"
  );

  useEffect(() => {
    if (!token) return;

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97, rotate: -2 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: -0.5 }}
        transition={{ duration: 0.5, ease: "easeOut", type: "spring" }}
        className="w-full max-w-sm relative"
      >
        <div
          className="washi-tape-accent w-24 h-6 -top-2.5!"
          style={{ opacity: 0.8, background: "var(--blue)" }}
        />

        <div className="glass-panel rounded-3xl p-7 sm:p-9 scrapbook-card">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-center mb-6"
          >
            <p
              className="text-[10px] font-semibold tracking-[0.22em] uppercase mb-4"
              style={{ color: "var(--text-3)" }}
            >
              nexia account
            </p>

            {status === "loading" && (
              <>
                <div className="text-4xl mb-4">⏳</div>
                <h1
                  className="text-2xl font-semibold tracking-tight"
                  style={{ color: "var(--text-1)" }}
                >
                  Verifying…
                </h1>
              </>
            )}

            {status === "success" && (
              <>
                <div className="text-4xl mb-4">✅</div>
                <h1
                  className="text-2xl font-semibold tracking-tight mb-3"
                  style={{ color: "var(--text-1)" }}
                >
                  Email verified!
                </h1>
                <p className="text-sm" style={{ color: "var(--text-2)" }}>
                  Your email has been verified. You can now sign in to Nexia.
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="text-4xl mb-4">❌</div>
                <h1
                  className="text-2xl font-semibold tracking-tight mb-3"
                  style={{ color: "var(--text-1)" }}
                >
                  Link invalid
                </h1>
                <p className="text-sm" style={{ color: "var(--text-2)" }}>
                  This link is invalid or has already been used. Please sign up again or request a
                  new verification email.
                </p>
              </>
            )}
          </motion.div>

          {status === "success" && (
            <Link href="/login">
              <button
                className="w-full py-3 rounded-2xl text-sm font-semibold tracking-wide transition-all"
                style={{ background: "var(--blue)", color: "#ffffff" }}
              >
                Sign In
              </button>
            </Link>
          )}
        </div>

        {status !== "loading" && (
          <p className="text-center text-xs mt-4" style={{ color: "var(--text-3)" }}>
            <Link
              href="/login"
              className="underline underline-offset-2 transition-colors"
              style={{ color: "var(--text-2)" }}
            >
              Back to sign in
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmailConfirmPage() {
  return (
    <Suspense>
      <VerifyEmailConfirmContent />
    </Suspense>
  );
}
