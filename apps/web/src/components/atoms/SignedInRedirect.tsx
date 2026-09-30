"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Sends a signed-in visitor on the public landing page into the app. For
 * everyone else it costs nothing: with no session cookie there is no check.
 */
export default function SignedInRedirect() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "signed-in") router.replace("/profiles");
  }, [status, router]);

  return null;
}
