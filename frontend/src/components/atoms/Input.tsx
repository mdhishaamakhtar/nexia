import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export default function Input({ label, error, className, ...props }: InputProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2 ml-1">
                    {label}
                </label>
            )}
            <input
                className={`w-full glass-input px-4 py-3 rounded-xl focus:outline-none transition-all duration-200 placeholder:text-slate-600 ${error ? "border-red-500/50 focus:border-red-500" : ""
                    } ${className}`}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-red-400 ml-1">{error}</p>}
        </div>
    );
}
