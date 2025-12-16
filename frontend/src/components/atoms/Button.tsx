import React from "react";
import { Loader2 } from "lucide-react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  isLoading?: boolean;
}

export default function Button({
  children,
  className,
  variant = "primary",
  isLoading,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-gradient-to-r from-[var(--color-primary-from)] to-[var(--color-primary-to)] text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 border-transparent",
    secondary:
      "bg-[var(--color-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-highlight)] hover:border-[var(--color-text-secondary)]",
    destructive:
      "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40",
    ghost:
      "bg-transparent border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-highlight)]",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={isLoading || disabled}
      className={cn(
        "relative flex items-center justify-center px-6 py-3 rounded-xl font-medium transition-all duration-200 border disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </motion.button>
  );
}
