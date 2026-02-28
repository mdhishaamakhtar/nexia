import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, ...props },
  ref
) {
  return (
    <div className="w-full min-w-0">
      {label && (
        <label className="block text-[10px] font-semibold text-[var(--text-3)] mb-2 ml-0.5 uppercase tracking-[0.12em]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full glass-input px-4 py-3 rounded-xl transition-all duration-200 ${
          error ? "border-red-500/50 focus:border-red-500" : ""
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-[var(--red)] ml-0.5 opacity-80">{error}</p>}
    </div>
  );
});

export default Input;
