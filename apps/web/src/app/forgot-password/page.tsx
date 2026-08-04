"use client";

import { useState } from "react";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import AuthCard, { AuthError, AuthLink } from "@/components/layout/AuthCard";
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
      setError("We couldn't send that email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Forgot password"
      eyebrow="account recovery"
      tape="peach"
      footer={
        <p>
          <AuthLink href="/login">Back to sign in</AuthLink>
        </p>
      }
    >
      {submitted ? (
        <div className="space-y-3 text-center">
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
            If that email has an account, reset instructions are on their way.
          </p>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Check your spam folder if it doesn&apos;t arrive in a few minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <p className="text-center text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          {error && <AuthError message={error} />}

          <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
