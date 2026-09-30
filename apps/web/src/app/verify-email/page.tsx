import type { Metadata } from "next";
import AuthCard, { AuthLink } from "@/components/layout/AuthCard";
import ResendVerification from "@/features/auth/ResendVerification";

export const metadata: Metadata = {
  title: "Check your email",
};

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Check your email"
      eyebrow="almost there"
      tape="blue"
      footer={<AuthLink href="/login">Back to sign in</AuthLink>}
    >
      <div className="space-y-5 text-center">
        <p className="t-body text-text-2">
          We&apos;ve sent a link to confirm your address. Open it, then sign in. It works for 24
          hours.
        </p>
        <p className="text-xs leading-relaxed text-text-3">
          Already have an account with this address? Sign in, or reset your password instead.
        </p>
        <div className="border-t border-line pt-5">
          <p className="t-label mb-3">Nothing arrived?</p>
          <ResendVerification />
        </div>
      </div>
    </AuthCard>
  );
}
