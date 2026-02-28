"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import { forgotPassword } from "@/features/auth/api";
import { getErrorMessage } from "@/shared/api/client";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await forgotPassword(username);
      setResetToken(data.reset_token);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not generate reset token"));
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

          {resetToken ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <p className="text-xs text-center" style={{ color: "var(--text-2)" }}>
                Your reset token is ready. Copy it and use it on the next page. It expires in{" "}
                <strong>15 minutes</strong> and can only be used once.
              </p>

              <div
                className="rounded-xl px-4 py-3 border break-all font-mono text-xs select-all"
                style={{
                  background: "var(--fill)",
                  borderColor: "var(--border)",
                  color: "var(--text-1)",
                }}
              >
                {resetToken}
              </div>

              <Link href={`/reset-password?token=${encodeURIComponent(resetToken)}`}>
                <Button variant="primary" className="w-full py-3 text-sm tracking-wide mt-1">
                  Set new password
                </Button>
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-center mb-4" style={{ color: "var(--text-3)" }}>
                Enter your username and we&apos;ll generate a one-time reset token.
              </p>

              <Input
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="enter your username"
                type="text"
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
                Generate reset token
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
