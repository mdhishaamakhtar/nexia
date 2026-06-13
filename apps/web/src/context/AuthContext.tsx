"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getSession, logoutSession } from "@/features/auth/api";

interface AuthContextType {
  isAuthenticated: boolean;
  userID: number | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userID, setUserID] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    getSession()
      .then((session) => {
        if (cancelled) return;
        setIsAuthenticated(session.authenticated);
        setUserID(session.user_id);
      })
      .catch(() => {
        if (cancelled) return;
        setIsAuthenticated(false);
        setUserID(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const session = await getSession();
      setIsAuthenticated(session.authenticated);
      setUserID(session.user_id);
    } catch {
      setIsAuthenticated(false);
      setUserID(null);
    }
  }, []);

  const login = async () => {
    queryClient.clear();
    await refreshSession();
    router.push("/profiles");
  };

  const logout = async () => {
    try {
      await logoutSession();
      queryClient.clear();
    } finally {
      setIsAuthenticated(false);
      setUserID(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userID, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
