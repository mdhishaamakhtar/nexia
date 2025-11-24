import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export default function Textarea({ label, error, className, ...props }: TextareaProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2 ml-1">
                    {label}
                </label>
            )}
            <textarea
                className={`w-full glass-input px-4 py-3 rounded-xl focus:outline-none transition-all duration-200 placeholder:text-slate-600 resize-none ${error ? "border-red-500/50 focus:border-red-500" : ""
                    } ${className}`}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-red-400 ml-1">{error}</p>}
        </div>
    );
}
