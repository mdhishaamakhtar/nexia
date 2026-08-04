"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import Button from "@/components/atoms/Button";
import AuthCard, { AuthLink } from "@/components/layout/AuthCard";
import { verifyEmail } from "@/features/auth/api";

type Status = "loading" | "success" | "error";

// Drawn icons from the app's icon set, not emoji — emoji render differently on
// every platform and can't take a token colour.
const STATE = {
  loading: {
    icon: Loader2,
    tint: "var(--text-3)",
    title: "Verifying…",
    body: "Hang tight while we confirm your email address.",
  },
  success: {
    icon: CircleCheck,
    tint: "var(--green-ink)",
    title: "Email verified",
    body: "Your email is confirmed. You can sign in to Nexia now.",
  },
  error: {
    icon: CircleAlert,
    tint: "var(--red-ink)",
    title: "That link didn't work",
    body: "It may have expired or already been used. Sign up again to get a fresh link.",
  },
} as const;

function VerifyEmailConfirmContent() {
  const token = useSearchParams().get("token") ?? "";
  const [status, setStatus] = useState<Status>(() => (token ? "loading" : "error"));

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  const { icon: Icon, tint, title, body } = STATE[status];

  return (
    <AuthCard
      title={title}
      eyebrow="nexia account"
      tape={status === "error" ? "peach" : "blue"}
      footer={
        status === "loading" ? undefined : (
          <p>
            <AuthLink href="/login">Back to sign in</AuthLink>
          </p>
        )
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <Icon
          className={`h-8 w-8 ${status === "loading" ? "animate-spin" : ""}`}
          style={{ color: tint }}
          aria-hidden="true"
        />
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
          {body}
        </p>

        {status === "success" && (
          <Link href="/login" className="w-full">
            <Button className="w-full">Sign in</Button>
          </Link>
        )}
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailConfirmPage() {
  return (
    <Suspense>
      <VerifyEmailConfirmContent />
    </Suspense>
  );
}
