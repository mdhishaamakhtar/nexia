"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import { forgotPassword } from "@/features/auth/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1
              className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2"
              style={{ color: "var(--text-1)" }}
            >
              Forgot Password
            </h1>
            <p
              className="text-[10px] font-semibold tracking-[0.22em] uppercase"
              style={{ color: "var(--text-3)" }}
            >
              nexia account recovery
            </p>
          </motion.div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-3"
            >
              <div className="text-3xl mb-2">📬</div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                If that email is registered, you&apos;ll receive reset instructions shortly.
              </p>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>
                Check your spam folder if you don&apos;t see it.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-center mb-4" style={{ color: "var(--text-3)" }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <Input
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="enter your email"
                type="email"
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="px-4 py-3 rounded-xl text-xs flex items-center gap-2 border"
                  style={{
                    background: "rgba(255,59,48,0.06)",
                    borderColor: "rgba(255,59,48,0.15)",
                    color: "var(--red)",
                  }}
                >
                  <span className="w-1 h-1 rounded-full bg-[var(--red)] shrink-0" />
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                isLoading={isLoading}
                variant="primary"
                className="w-full py-3 text-sm tracking-wide mt-2"
              >
                Send reset link
              </Button>
            </form>
          )}
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
