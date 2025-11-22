"use client";

import { LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function Navbar() {
    const { logout } = useAuth();
    const router = useRouter();

    return (
        <nav className="sticky top-0 z-50 bg-[var(--color-surface)]/95 backdrop-blur-sm border-b border-[var(--color-border-subtle)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <button
                        onClick={() => router.push("/profiles")}
                        className="text-2xl font-bold tracking-tight hover:text-[var(--color-accent-cta)] transition-colors duration-200"
                    >
                        nexia
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-border-subtle)] transition-all duration-200 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
