"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import Button from "@/components/atoms/Button";
import AuthCard, { AuthLink } from "@/components/layout/AuthCard";
import { verifyEmail } from "@/features/auth/api";
import ResendVerification from "@/features/auth/ResendVerification";

function Confirm() {
  const token = useSearchParams().get("token") ?? "";
  // A query, not a mutation: confirming is an idempotent GET, and a query
  // survives React's development double-mount where a mutation fired from an
  // effect loses its observer and never leaves "pending".
  const verify = useQuery({
    queryKey: ["verify-email", token],
    queryFn: () => verifyEmail(token).then(() => true),
    enabled: token !== "",
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });

  const status = !token
    ? "error"
    : verify.isSuccess
      ? "success"
      : verify.isError
        ? "error"
        : "loading";

  if (status === "loading") {
    return (
      <AuthCard title="Confirming…" eyebrow="nexia account" tape="blue">
        <div className="flex justify-center" role="status" aria-label="Confirming your email">
          <Loader2 className="h-8 w-8 animate-spin text-text-3" aria-hidden="true" />
        </div>
      </AuthCard>
    );
  }

  if (status === "success") {
    return (
      <AuthCard title="Email confirmed" eyebrow="nexia account" tape="blue">
        <div className="flex flex-col items-center gap-4 text-center">
          <CircleCheck className="h-8 w-8 text-green-ink" aria-hidden="true" />
          <p className="t-body text-text-2">Your address is confirmed. You can sign in now.</p>
          <Button href="/login" className="w-full">
            Sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="That link didn't work"
      eyebrow="nexia account"
      tape="peach"
      footer={<AuthLink href="/login">Back to sign in</AuthLink>}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <CircleAlert className="h-8 w-8 text-red-ink" aria-hidden="true" />
        <p className="t-body text-text-2">
          It may have expired (links work for 24 hours) or been replaced by a newer one. Get a fresh
          link below.
        </p>
        <div className="w-full border-t border-line pt-5">
          <ResendVerification label="Send me a new link" />
        </div>
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailConfirmPage() {
  return (
    <Suspense>
      <Confirm />
    </Suspense>
  );
}
