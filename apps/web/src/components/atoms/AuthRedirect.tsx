"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Drop into any public page (landing, login) to redirect authenticated users
 * straight to /profiles. Renders nothing — purely side-effect.
 */
export function AuthRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/profiles");
    }
  }, [isAuthenticated, isLoading, router]);

  return null;
}
