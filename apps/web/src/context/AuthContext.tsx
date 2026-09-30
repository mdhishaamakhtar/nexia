"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthSession } from "@nexia/shared";
import { getSession, logoutSession } from "@/features/auth/api";
import { CSRF_COOKIE_NAME, readCookie } from "@/shared/api/cookies";

/**
 * - `loading`: not known yet
 * - `signed-in` / `signed-out`: the server said so (only a 401 means signed out)
 * - `unreachable`: the check itself failed — an outage, not a sign-out. The
 *   dashboard shows a retry instead of sending someone to the login page over
 *   something signing in again cannot fix.
 */
export type AuthStatus = "loading" | "signed-in" | "signed-out" | "unreachable";

interface AuthContextValue {
  status: AuthStatus;
  userId: number | null;
  /** Call after a successful sign-in, before navigating. */
  signedIn: () => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const SESSION_QUERY_KEY = ["session"] as const;

/**
 * Whether a session cookie pair exists. The readable CSRF cookie lives and dies
 * with the httpOnly session, so without it there is nothing to ask the server
 * about: public pages load with no request at all. On the server the answer is
 * "unknown", which keeps the first client render identical to the server's.
 */
function useHasSessionMarker(): boolean | null {
  return useSyncExternalStore(
    () => () => {},
    () => readCookie(CSRF_COOKIE_NAME) !== null,
    () => null
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasMarker = useHasSessionMarker();

  const session = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: getSession,
    enabled: hasMarker === true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const status: AuthStatus =
    hasMarker === null
      ? "loading"
      : hasMarker === false
        ? session.data
          ? "signed-in"
          : "signed-out"
        : session.isPending
          ? "loading"
          : session.isError
            ? "unreachable"
            : session.data
              ? "signed-in"
              : "signed-out";

  /**
   * Drops every cached answer from the previous session — another account's
   * profiles must never show — except the session itself, which is updated in
   * place so everything watching it hears the change at once.
   */
  const resetTo = useCallback(
    (session: AuthSession | null) => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== SESSION_QUERY_KEY[0] });
      queryClient.setQueryData(SESSION_QUERY_KEY, session);
    },
    [queryClient]
  );

  const signedIn = useCallback(async () => resetTo(await getSession()), [resetTo]);

  const signOut = useCallback(async () => {
    try {
      await logoutSession();
    } finally {
      resetTo(null);
      router.replace("/login");
    }
  }, [resetTo, router]);

  const retry = useCallback(() => void session.refetch(), [session]);

  const value = useMemo(
    () => ({ status, userId: session.data?.user_id ?? null, signedIn, signOut, retry }),
    [status, session.data, signedIn, signOut, retry]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
