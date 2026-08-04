"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HTTPError } from "ky";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import AuthCard, { AuthError, AuthLink } from "@/components/layout/AuthCard";
import { login, signup } from "@/features/auth/api";
import { getErrorMessage } from "@/shared/api/client";
import type { ApiErrorResponse } from "@/shared/types/api";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login: authLogin, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace("/profiles");
  }, [isAuthenticated, authLoading, router]);

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
      setError(await describeAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <AuthCard
      title="Nexia"
      eyebrow="your digital slambook"
      footer={
        <>
          <p>
            {isLogin ? "New here? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setMode(isLogin ? "signup" : "login")}
              className="cursor-pointer font-semibold underline underline-offset-2"
              style={{ color: "var(--text-2)" }}
            >
              {isLogin ? "Create an account" : "Sign in"}
            </button>
          </p>
          {isLogin && (
            <p className="mt-1.5">
              <AuthLink href="/forgot-password">Forgot password?</AuthLink>
            </p>
          )}
        </>
      }
    >
      {/* Segmented control with a sliding thumb. The thumb is the dark blue
          ink with white text (4.8:1) — the old pale-blue thumb with white text
          sat at 1.8:1. */}
      <div
        className="relative mb-7 flex rounded-xl border p-1"
        role="tablist"
        aria-label="Authentication mode"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        <motion.div
          className="absolute top-1 bottom-1 left-1 z-0 w-[calc(50%-4px)] rounded-lg"
          style={{ background: "var(--blue-ink)" }}
          initial={false}
          animate={{ x: mode === "login" ? "0%" : "100%" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          aria-hidden="true"
        />
        {(["login", "signup"] as const).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(m)}
              className="relative z-10 flex-1 cursor-pointer rounded-lg px-3 py-2.5 text-xs font-bold transition-colors duration-150"
              style={{ color: active ? "var(--surface)" : "var(--text-3)" }}
            >
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isLogin ? "Your password" : "At least 8 characters"}
        />

        {error && <AuthError message={error} />}

        <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
          {isLogin ? "Sign in" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}

/** Turns an auth failure into something the person can actually act on. */
async function describeAuthError(err: unknown): Promise<string> {
  if (err instanceof HTTPError) {
    try {
      const data = (await err.response.clone().json()) as ApiErrorResponse;
      switch (data?.error?.code) {
        case "ACCOUNT_NOT_FOUND":
          return "No account found with that email. Try creating one instead.";
        case "EMAIL_NOT_VERIFIED":
          return "Check your inbox and verify your email before signing in.";
        case "EMAIL_CONFLICT":
          return "That email already has an account. Try signing in instead.";
        default:
          return data?.error?.message ?? "Something went wrong. Please try again.";
      }
    } catch {
      return "Something went wrong. Please try again.";
    }
  }
  return getErrorMessage(err, "Something went wrong. Please try again.");
}
