"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import AuthCard, { AuthError, AuthLink } from "@/components/layout/AuthCard";
import { resetPassword } from "@/features/auth/api";
import { getErrorMessage } from "@/shared/api/client";

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Your new password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Those two passwords don't match.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: unknown) {
      setError(await getErrorMessage(err, "That reset link didn't work. Request a new one."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Reset password"
      eyebrow="account recovery"
      tape="peach"
      footer={
        success ? undefined : (
          <p>
            Need a reset link? <AuthLink href="/forgot-password">Request one</AuthLink>
          </p>
        )
      }
    >
      {success ? (
        <div className="space-y-2 text-center">
          <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
            Password updated
          </p>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Taking you to sign in&hellip;
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Reset token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the token from your email"
            required
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your new password"
            required
          />

          {error && <AuthError message={error} />}

          <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
            Set new password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
