"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import { resetPassword } from "@/features/auth/api";
import { getErrorMessage } from "@/shared/api/client";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to reset password"));
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
          style={{ opacity: 0.8, background: "var(--peach)" }}
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
              Reset Password
            </h1>
            <p
              className="text-[10px] font-semibold tracking-[0.22em] uppercase"
              style={{ color: "var(--text-3)" }}
            >
              nexia account recovery
            </p>
          </motion.div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-3"
            >
              <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                Password updated!
              </p>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>
                Redirecting you to sign in&hellip;
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Reset token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="paste your reset token"
                type="text"
              />

              <Input
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="at least 6 characters"
                type="password"
              />

              <Input
                label="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="repeat your new password"
                type="password"
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
                Set new password
              </Button>
            </form>
          )}
        </div>

        {!success && (
          <p className="text-center text-xs mt-4" style={{ color: "var(--text-3)" }}>
            Need a token?{" "}
            <Link
              href="/forgot-password"
              className="underline underline-offset-2 transition-colors"
              style={{ color: "var(--text-2)" }}
            >
              Request one here
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
