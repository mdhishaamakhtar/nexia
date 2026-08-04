import type { Metadata } from "next";
import AuthCard, { AuthLink } from "@/components/layout/AuthCard";

export const metadata: Metadata = {
  title: "Check your email",
};

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Check your email"
      eyebrow="almost there"
      tape="blue"
      footer={
        <p>
          <AuthLink href="/login">Back to sign in</AuthLink>
        </p>
      }
    >
      <div className="space-y-4 text-center">
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
          We&apos;ve sent a verification link to your email address. Open it to activate your Nexia
          account.
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>
          The link expires in <strong style={{ color: "var(--text-2)" }}>24 hours</strong>. Check
          your spam folder if you don&apos;t see it.
        </p>
      </div>
    </AuthCard>
  );
}
