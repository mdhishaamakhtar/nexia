"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { token, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !token) {
            router.push("/login");
        }
    }, [token, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="shimmer-bg w-16 h-16 rounded-full animate-[shimmer_2s_linear_infinite]" />
            </div>
        );
    }

    if (!token) {
        return null;
    }

    return <>{children}</>;
}
