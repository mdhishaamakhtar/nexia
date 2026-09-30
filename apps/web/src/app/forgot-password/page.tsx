"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { forgotPasswordRequestSchema } from "@nexia/shared";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import AuthCard, { AuthLink, AuthNotice } from "@/components/layout/AuthCard";
import { forgotPassword } from "@/features/auth/api";
import { getErrorMessage } from "@/shared/api/client";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const form = useForm<{ email: string }>({
    resolver: zodResolver(forgotPasswordRequestSchema),
    defaultValues: { email: "" },
  });
  const send = useMutation({ mutationFn: (email: string) => forgotPassword(email) });
  const [error, setError] = useState("");

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError("");
    try {
      await send.mutateAsync(email);
    } catch (err) {
      setError(await getErrorMessage(err, "We couldn't send that email. Try again in a moment."));
    }
  });

  return (
    <AuthCard
      title="Forgot password"
      eyebrow="account recovery"
      tape="peach"
      footer={<AuthLink href="/login">Back to sign in</AuthLink>}
    >
      {send.isSuccess ? (
        <div className="space-y-3 text-center">
          <p className="t-body text-text-2">
            If that email has an account, a link to choose a new password is on its way. It works
            for 15 minutes.
          </p>
          <p className="text-xs text-text-3">
            Nothing after a few minutes? Check your spam folder.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <p className="text-center text-sm leading-relaxed text-text-2">
            Enter your email and we&apos;ll send you a link to choose a new password.
          </p>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={form.formState.errors.email?.message}
            {...form.register("email")}
          />
          {error && <AuthNotice>{error}</AuthNotice>}
          <Button type="submit" isLoading={send.isPending} className="mt-2 w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
