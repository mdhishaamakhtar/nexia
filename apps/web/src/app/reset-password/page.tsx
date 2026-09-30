"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { newPasswordSchema, emailTokenSchema, PASSWORD_MIN_LENGTH } from "@nexia/shared";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import AuthCard, { AuthLink, AuthNotice } from "@/components/layout/AuthCard";
import { resetPassword } from "@/features/auth/api";
import { readApiError } from "@/shared/api/client";

const schema = z
  .object({ password: newPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Those two passwords don't match",
  });

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const tokenValid = emailTokenSchema.safeParse(token).success;
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });
  const reset = useMutation({ mutationFn: (password: string) => resetPassword(token, password) });
  const [error, setError] = useState("");

  if (!tokenValid) {
    return (
      <AuthCard
        title="That link is incomplete"
        eyebrow="account recovery"
        tape="peach"
        footer={<AuthLink href="/login">Back to sign in</AuthLink>}
      >
        <p className="t-body text-center text-text-2">
          Open the link straight from the email, or ask for a new one.
        </p>
        <Button href="/forgot-password" className="mt-6 w-full">
          Send me a new link
        </Button>
      </AuthCard>
    );
  }

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError("");
    try {
      await reset.mutateAsync(password);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      const api = await readApiError(err);
      setError(
        api?.code === "NOT_FOUND"
          ? "This link has expired or was already used. Ask for a new one."
          : api?.code === "VALIDATION_ERROR"
            ? api.message
            : "Couldn't reach Nexia. Check your connection and try again."
      );
    }
  });

  return (
    <AuthCard
      title="Choose a new password"
      eyebrow="account recovery"
      tape="peach"
      footer={
        reset.isSuccess ? undefined : (
          <p>
            Link expired? <AuthLink href="/forgot-password">Send a new one</AuthLink>
          </p>
        )
      }
    >
      {reset.isSuccess ? (
        <AuthNotice tone="success">Password updated. Taking you to sign in…</AuthNotice>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            error={form.formState.errors.password?.message}
            {...form.register("password")}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            placeholder="Type it again"
            error={form.formState.errors.confirm?.message}
            {...form.register("confirm")}
          />
          <p className="text-xs text-text-3">
            Setting a new password signs you out on your other devices.
          </p>
          {error && <AuthNotice>{error}</AuthNotice>}
          <Button type="submit" isLoading={reset.isPending} className="mt-2 w-full">
            Set new password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
