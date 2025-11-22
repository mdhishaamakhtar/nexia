"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";

export default function LoginPage() {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await api.post("/auth", { username, password });
            const { token } = response.data;
            login(token);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || "Authentication failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Spotlight background effect */}
            <div className="absolute inset-0 bg-gradient-radial from-[var(--color-accent)]/10 via-transparent to-transparent opacity-50" />

            <div className="relative z-10 w-full max-w-md">
                <div className="bg-[var(--color-surface)] rounded-2xl p-8 border border-[var(--color-border-subtle)] shadow-2xl">
                    {/* Title */}
                    <h1 className="text-4xl font-bold text-center mb-2 tracking-tight">
                        nexia
                    </h1>

                    {/* Subtitle */}
                    <p className="text-center text-[var(--color-text-secondary)] mb-8">
                        {mode === "login"
                            ? "Welcome back to your slambook"
                            : "Create your memory space"}
                    </p>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            type="text"
                        />

                        <Input
                            label="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            type="password"
                        />

                        {error && (
                            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            isLoading={isLoading}
                            variant="primary"
                            className="w-full"
                        >
                            {mode === "login" ? "Login" : "Sign Up"}
                        </Button>
                    </form>

                    {/* Toggle mode */}
                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => setMode(mode === "login" ? "signup" : "login")}
                            className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cta)] transition-colors duration-200 text-sm"
                        >
                            {mode === "login"
                                ? "Don't have an account? Sign up"
                                : "Already have an account? Login"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
