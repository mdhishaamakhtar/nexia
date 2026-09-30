"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { loginRequestSchema, signupRequestSchema, PASSWORD_MIN_LENGTH } from "@nexia/shared";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import AuthCard, { AuthLink, AuthNotice } from "@/components/layout/AuthCard";
import { login, resendVerification, signup } from "@/features/auth/api";
import { rememberPendingEmail, safeNext } from "@/features/auth/pending-email";
import { readApiError } from "@/shared/api/client";
import { SETTLE } from "@/shared/ui/motion";

type Mode = "login" | "signup";
type Credentials = { email: string; password: string };

/**
 * Sign-in checks only that a password was typed; account creation applies the
 * real password rule. One form serves both, so the resolver reads the mode
 * from RHF's `context`, which is refreshed on every render.
 */
const RESOLVERS = {
  login: zodResolver(loginRequestSchema) as unknown as Resolver<Credentials, { mode: Mode }>,
  signup: zodResolver(signupRequestSchema) as unknown as Resolver<Credentials, { mode: Mode }>,
};

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "login", label: "Sign in" },
  { id: "signup", label: "Create account" },
];

/** `/login#signup` opens straight onto account creation. */
function useInitialMode(): Mode {
  return useSyncExternalStore(
    () => () => {},
    () => (window.location.hash === "#signup" ? "signup" : "login"),
    () => "login"
  );
}

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { status, signedIn } = useAuth();
  const initialMode = useInitialMode();
  const [chosenMode, setMode] = useState<Mode | null>(null);
  const mode = chosenMode ?? initialMode;
  const isLogin = mode === "login";
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ login: null, signup: null });

  useEffect(() => {
    if (status === "signed-in") router.replace(next);
  }, [status, router, next]);

  const form = useForm<Credentials, { mode: Mode }>({
    resolver: (values, context, options) =>
      RESOLVERS[context?.mode ?? "login"](values, context, options),
    context: { mode },
    defaultValues: { email: "", password: "" },
  });

  const submit = useMutation({
    mutationFn: async (values: { email: string; password: string }) => {
      if (isLogin) {
        await login(values.email, values.password);
        await signedIn();
        router.replace(next);
      } else {
        await signup(values.email, values.password);
        rememberPendingEmail(values.email);
        router.push("/verify-email");
      }
    },
  });
  const resend = useMutation({ mutationFn: () => resendVerification(form.getValues("email")) });
  const [problem, setProblem] = useState<{ code: string; message: string } | null>(null);

  const onSubmit = form.handleSubmit(async (values) => {
    setProblem(null);
    resend.reset();
    try {
      await submit.mutateAsync(values);
    } catch (err) {
      const api = await readApiError(err);
      setProblem({ code: api?.code ?? "NETWORK", message: api?.message ?? "" });
    }
  });

  const switchTo = (next: Mode) => {
    setMode(next);
    setProblem(null);
    form.clearErrors();
    tabRefs.current[next]?.focus();
  };

  return (
    <AuthCard
      title="Nexia"
      eyebrow="your digital slambook"
      footer={
        isLogin ? (
          <AuthLink href="/forgot-password">Forgot your password?</AuthLink>
        ) : (
          <p>We&apos;ll email you a link to confirm your address.</p>
        )
      }
    >
      <div
        role="tablist"
        aria-label="Sign in or create an account"
        className="relative mb-7 flex rounded-xl border border-line bg-surface-2 p-1"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            switchTo(isLogin ? "signup" : "login");
          }
        }}
      >
        <motion.div
          className="absolute bottom-1 left-1 top-1 z-0 w-[calc(50%-4px)] rounded-lg bg-blue-ink-deep"
          initial={false}
          animate={{ x: isLogin ? "0%" : "100%" }}
          transition={SETTLE}
          aria-hidden="true"
        />
        {MODES.map(({ id, label }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => switchTo(id)}
              className={`relative z-10 min-h-11 flex-1 rounded-lg px-3 text-[13px] font-bold transition-colors duration-150 ${active ? "text-surface" : "text-text-3 hover:text-text-1"}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder={isLogin ? "Your password" : `At least ${PASSWORD_MIN_LENGTH} characters`}
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />

        {problem?.code === "EMAIL_NOT_VERIFIED" ? (
          resend.isSuccess ? (
            <AuthNotice tone="success">A new link is on its way. Open it, then sign in.</AuthNotice>
          ) : (
            <AuthNotice>
              <p>Confirm your email first: the link is in your inbox.</p>
              <button
                type="button"
                onClick={() => resend.mutate()}
                disabled={resend.isPending}
                className="mt-1.5 font-bold underline underline-offset-2"
              >
                {resend.isPending ? "Sending…" : "Send me a new link"}
              </button>
            </AuthNotice>
          )
        ) : problem ? (
          <AuthNotice>
            {problem.code === "UNAUTHORIZED"
              ? "That email and password don't match. Check them, or reset your password."
              : problem.code === "RATE_LIMITED"
                ? problem.message
                : problem.code === "NETWORK"
                  ? "Couldn't reach Nexia. Check your connection and try again."
                  : "Something went wrong on our side. Try again in a moment."}
          </AuthNotice>
        ) : null}

        <Button type="submit" isLoading={submit.isPending} className="mt-2 w-full">
          {isLogin ? "Sign in" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
