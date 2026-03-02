"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import { motion } from "framer-motion";
import { login, signup } from "@/features/auth/api";
import { getErrorMessage } from "@/shared/api/client";
import type { ApiErrorResponse } from "@/shared/types/api";
import type { AxiosError } from "axios";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (mode === "signup") {
        await signup(email, password);
        router.push("/verify-email");
      } else {
        await login(email, password);
        await authLogin();
      }
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      const code = axiosErr?.response?.data?.error?.code;
      if (code === "ACCOUNT_NOT_FOUND") {
        setError("No account found with that email. Try signing up instead.");
      } else if (code === "EMAIL_NOT_VERIFIED") {
        setError("Please verify your email before signing in.");
      } else {
        setError(getErrorMessage(err, "Authentication failed"));
      }
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
        {/* Decorative Tape for Login */}
        <div
          className="washi-tape-accent w-24 h-6 -top-2.5!"
          style={{ opacity: 0.8, background: "var(--lavender)" }}
        />

        <div className="glass-panel rounded-3xl p-7 sm:p-9 scrapbook-card">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-center mb-8"
          >
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-tight mb-2"
              style={{ color: "var(--text-1)" }}
            >
              Nexia
            </h1>
            <p
              className="text-[10px] font-semibold tracking-[0.22em] uppercase"
              style={{ color: "var(--text-3)" }}
            >
              your digital slambook
            </p>
          </motion.div>

          {/* Mode toggle */}
          <div
            className="flex rounded-xl p-1 mb-8 border relative"
            style={{
              background: "var(--fill)",
              borderColor: "var(--border)",
            }}
          >
            {/* Pure GPU Slider */}
            <motion.div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] left-1 rounded-lg shadow-sm z-0"
              style={{ background: "var(--blue)" }}
              initial={false}
              animate={{ x: mode === "login" ? "0%" : "100%" }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />

            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors duration-150 tracking-wide cursor-pointer relative z-10 hover:opacity-80 active:scale-[0.98]"
                style={{
                  color: mode === m ? "var(--bg-raised)" : "var(--text-3)",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="enter your email"
              type="email"
            />

            <Input
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="enter your password"
              type="password"
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="px-4 py-3 rounded-xl text-xs flex items-center gap-2 border overflow-hidden"
                style={{
                  background: "rgba(255,59,48,0.06)",
                  borderColor: "rgba(255,59,48,0.15)",
                  color: "var(--red)",
                }}
              >
                <span className="w-1 h-1 rounded-full bg-(--red) shrink-0" />
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              isLoading={isLoading}
              variant="primary"
              className="w-full py-3 text-sm tracking-wide mt-2"
            >
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "var(--text-3)" }}>
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="underline underline-offset-2 transition-colors cursor-pointer"
            style={{ color: "var(--text-2)" }}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>

        <div className="text-center text-xs mt-2 h-[18px]" style={{ color: "var(--text-3)" }}>
          {mode === "login" && (
            <Link
              href="/forgot-password"
              className="underline underline-offset-2 transition-colors cursor-pointer"
              style={{ color: "var(--text-2)" }}
            >
              Forgot password?
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
