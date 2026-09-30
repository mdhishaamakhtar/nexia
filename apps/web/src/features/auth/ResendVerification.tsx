"use client";

import { useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { resendVerificationRequestSchema } from "@nexia/shared";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import { AuthNotice } from "@/components/layout/AuthCard";
import { getErrorMessage } from "@/shared/api/client";
import { resendVerification } from "./api";
import { pendingEmail } from "./pending-email";

/**
 * Asks for a fresh verification link. The answer is the same whether or not
 * the address has an account, so this can't be used to find out.
 */
export default function ResendVerification({ label = "Send a new link" }: { label?: string }) {
  const remembered = useSyncExternalStore(
    () => () => {},
    pendingEmail,
    () => ""
  );
  const form = useForm<{ email: string }>({
    resolver: zodResolver(resendVerificationRequestSchema),
    values: { email: remembered },
  });
  const resend = useMutation({ mutationFn: (email: string) => resendVerification(email) });
  const [error, setError] = useState("");

  if (resend.isSuccess) {
    return (
      <AuthNotice tone="success">
        If that address still needs confirming, a new link is on its way. It works for 24 hours.
      </AuthNotice>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(async ({ email }) => {
        setError("");
        try {
          await resend.mutateAsync(email);
        } catch (err) {
          setError(await getErrorMessage(err, "Couldn't send that. Try again in a moment."));
        }
      })}
      className="space-y-3 text-left"
      noValidate
    >
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={form.formState.errors.email?.message}
        {...form.register("email")}
      />
      {error && <AuthNotice>{error}</AuthNotice>}
      <Button type="submit" variant="secondary" isLoading={resend.isPending} className="w-full">
        {label}
      </Button>
    </form>
  );
}
